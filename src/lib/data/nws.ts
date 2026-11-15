// NWS gridpoint adapter (mixing height, transport wind). Use when: you need the context overlay. Never rule inputs.
// Always resolves the grid via the points lookup (office differs by site). Retries once.
import type { NwsHour } from "./types";
import { fetchJson, phoenixHour } from "./time";

const UA = { "User-Agent": "spray-or-wait-demo", Accept: "application/geo+json" };

interface TimeSeries { values: { validTime: string; value: number | null }[] }

/** Expand "2026-11-15T12:00:00+00:00/PT3H" values to a map of local hour -> value. */
function flatten(ts: TimeSeries | undefined, out: Map<string, number | null>) {
  for (const { validTime, value } of ts?.values ?? []) {
    const [start, dur] = validTime.split("/");
    const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?)?$/.exec(dur ?? "");
    const hours = m ? Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0) : 1;
    const t0 = new Date(start).getTime();
    for (let h = 0; h < Math.max(1, hours); h++) out.set(phoenixHour(new Date(t0 + h * 3600000)), value);
  }
}

async function once(lat: number, lon: number, timeoutMs: number): Promise<NwsHour[]> {
  const pt = (await fetchJson(`https://api.weather.gov/points/${lat},${lon}`, timeoutMs, UA)) as {
    properties: { forecastGridData: string };
  };
  const gp = (await fetchJson(pt.properties.forecastGridData, timeoutMs, UA)) as {
    properties: Record<string, TimeSeries>;
  };
  const p = gp.properties;
  const mix = new Map<string, number | null>(), tw = new Map<string, number | null>();
  const td = new Map<string, number | null>(), tf = new Map<string, number | null>();
  flatten(p.mixingHeight, mix); flatten(p.transportWindSpeed, tw);
  flatten(p.transportWindDirection, td); flatten(p.twentyFootWindSpeed, tf);
  const times = [...new Set([...mix.keys(), ...tw.keys(), ...td.keys(), ...tf.keys()])].sort();
  return times.map((time) => ({
    time,
    mixingHeightM: mix.get(time) ?? null,
    transportWindKmh: tw.get(time) ?? null,
    transportWindDirDeg: td.get(time) ?? null,
    twentyFootWindKmh: tf.get(time) ?? null,
  }));
}

export async function fetchNwsGridpoint(lat: number, lon: number, timeoutMs = 4000): Promise<NwsHour[]> {
  try {
    return await once(lat, lon, timeoutMs);
  } catch {
    return await once(lat, lon, timeoutMs);
  }
}
