// AZMet hourly observation adapter. Use when: you need the latest real regional-station reading (single-station card).
// Tries the preferred station, then az36, az02, az14. Source fields are strings.
import type { StationReading } from "./types";
import { fetchJson, phoenixMinute } from "./time";

const FALLBACKS = ["az36", "az02", "az14"];
const MPH_TO_KMH = 1.609344;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

type Row = Record<string, string | number>;

export function parseAzmetRow(r: Row): StationReading {
  const wind = num(r.wind_spd_mph), gust = num(r.wind_spd_max_mph);
  const inch = num(r.precip_total_in);
  return {
    stationId: String(r.meta_station_id),
    stationName: String(r.meta_station_name),
    time: String(r.date_datetime).replace(" ", "T").slice(0, 13) + ":00",
    tempC: num(r.temp_airC),
    tempF: num(r.temp_airF),
    rhPct: num(r.relative_humidity),
    dewPointC: num(r.dwpt),
    windMph: wind,
    windKmh: wind === null ? null : wind * MPH_TO_KMH,
    windDirDeg: num(r.wind_vector_dir),
    gustMph: gust,
    gustKmh: gust === null ? null : gust * MPH_TO_KMH,
    precipMm: inch === null ? null : inch * 25.4,
  };
}

/** Last `hours` hourly rows for one station, oldest first. */
export async function fetchAzmetHours(station: string, hours = 12, timeoutMs = 4000): Promise<StationReading[]> {
  const start = phoenixMinute(new Date(Date.now() - hours * 3600000));
  const d = Math.floor(hours / 24), h = hours % 24;
  const j = (await fetchJson(
    `https://api.azmet.arizona.edu/v1/observations/hourly/${station}/${start}/P${d}DT${h}H`,
    timeoutMs,
  )) as { data: Row[] };
  return j.data.map(parseAzmetRow);
}

/** Latest reading. Use when: /api/station. Falls through stations until one has data. */
export async function fetchAzmetLatest(preferred: string, timeoutMs = 4000): Promise<StationReading> {
  for (const s of [preferred, ...FALLBACKS.filter((x) => x !== preferred)]) {
    try {
      const rows = await fetchAzmetHours(s, 12, timeoutMs);
      const last = rows.filter((r) => r.tempC !== null).at(-1);
      if (last) return last;
    } catch {
      /* try next station */
    }
  }
  throw new Error("no AZMet station returned data");
}
