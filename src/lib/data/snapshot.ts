// Committed snapshots + live-or-snapshot helper. Use when: an API route needs data that must never fail on stage.
// JSON is imported statically so it ships with the Vercel function. Refresh with `npm run snapshot`.
import omSnap from "../../../data/snapshots/open-meteo-forecast.json";
import nwsSnap from "../../../data/snapshots/nws-gridpoint.json";
import azSnap from "../../../data/snapshots/azmet.json";
import type { ApiEnvelope, HourlyRecord, NwsHour, SnapshotFile, StationReading } from "./types";
import { fetchOpenMeteoForecast } from "./openMeteo";
import { fetchNwsGridpoint } from "./nws";
import { fetchAzmetLatest } from "./azmet";
import { SITE } from "../site";

export const SNAPSHOTS = {
  openMeteo: omSnap as unknown as SnapshotFile<HourlyRecord[]>,
  nws: nwsSnap as unknown as SnapshotFile<NwsHour[]>,
  azmet: azSnap as unknown as SnapshotFile<StationReading[]>,
};

const DEADLINE_MS = 5000; // total live budget so no route nears Vercel's 10 s limit

/** Try live (5 s total timeout inside `live`), else snapshot. Reports which was used. Use when: wrapping any source. */
export async function liveOrSnapshot<T>(
  live: () => Promise<T>,
  snap: SnapshotFile<T>,
  offline: boolean,
  liveSources: string[],
): Promise<ApiEnvelope<T>> {
  if (!offline) {
    try {
      const data = await Promise.race([
        live(),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("deadline")), DEADLINE_MS)),
      ]);
      return { data, dataTime: new Date().toISOString(), sources: liveSources, source: "live" };
    } catch {
      /* fall through to snapshot */
    }
  }
  return { data: snap.data, dataTime: snap.fetchedAt, sources: snap.sources, source: "snapshot" };
}

const { lat, lon } = SITE.tower;

export const getForecast = (offline: boolean) =>
  liveOrSnapshot(() => fetchOpenMeteoForecast(lat, lon, 4000), SNAPSHOTS.openMeteo, offline, ["Open-Meteo"]);

export const getNws = (offline: boolean) =>
  liveOrSnapshot(() => fetchNwsGridpoint(lat, lon, 2500, false), SNAPSHOTS.nws, offline, ["NWS gridpoint"]);

export async function getStation(offline: boolean): Promise<ApiEnvelope<StationReading>> {
  const env = await liveOrSnapshot(
    async () => [await fetchAzmetLatest(SITE.azmetStationId, 4000)],
    SNAPSHOTS.azmet,
    offline,
    ["AZMet"],
  );
  return { ...env, data: env.data.filter((r) => r.tempC !== null).at(-1) ?? env.data.at(-1)! };
}
