// Historical Open-Meteo pulls with an on-disk cache. Use when: calibrate.ts or build-sim.ts needs hourly history.
import fs from "node:fs";
import path from "node:path";
import type { HourlyRecord } from "../src/lib/derive";

const VARS = [
  "temperature_2m", "temperature_80m", "wind_speed_10m", "wind_speed_80m", "wind_direction_10m",
  "wind_direction_80m", "relative_humidity_2m", "cloud_cover", "precipitation", "wind_gusts_10m", "surface_pressure",
];

export interface RawPull { lat: number; lon: number; start: string; end: string; records: (HourlyRecord | null)[]; nullHours: number }

/** Fetch hourly history for [start, end] (YYYY-MM-DD). Cached under `cacheDir`. Nulls are returned as skipped count; callers decide. */
export async function pullHourly(lat: number, lon: number, start: string, end: string, cacheDir: string): Promise<HourlyRecord[] & { nullHours?: number }> {
  const file = path.join(cacheDir, `hourly_${lat}_${lon}_${start}_${end}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const url = `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}` +
    `&hourly=${VARS.join(",")}&timezone=America%2FPhoenix&wind_speed_unit=kmh`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { hourly: Record<string, (string | number | null)[]> };
  const h = j.hourly;
  const out: HourlyRecord[] = [];
  for (let i = 0; i < h.time.length; i++) {
    const g = (k: string) => h[k][i] as number | null;
    const vals = VARS.map(g);
    if (vals.some((v) => v === null)) continue; // skipped; callers check continuity where it matters
    out.push({
      time: h.time[i] as string, t2mC: g("temperature_2m")!, t80mC: g("temperature_80m")!, ws10Kmh: g("wind_speed_10m")!,
      ws80Kmh: g("wind_speed_80m")!, wd10Deg: g("wind_direction_10m")!, wd80Deg: g("wind_direction_80m")!,
      rhPct: g("relative_humidity_2m")!, cloudPct: g("cloud_cover")!, precipMm: g("precipitation")!,
      gustKmh: g("wind_gusts_10m")!, pressureHpa: g("surface_pressure")!,
    });
  }
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out));
  return out;
}
