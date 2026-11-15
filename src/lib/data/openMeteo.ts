// Open-Meteo adapters. Use when: you need 7-day hourly model data (forecast) or the 2024-2026 archive (historical, for calibration).
// Metric units kept internally; times are local America/Phoenix.
import type { HourlyRecord } from "./types";
import { fetchJson } from "./time";

const HOURLY = [
  "temperature_2m", "temperature_80m", "temperature_120m", "temperature_180m",
  "wind_speed_10m", "wind_speed_80m", "wind_speed_120m", "wind_speed_180m",
  "wind_direction_10m", "wind_direction_80m", "wind_direction_120m", "wind_direction_180m",
  "wind_gusts_10m", "relative_humidity_2m", "dew_point_2m", "cloud_cover",
  "precipitation", "precipitation_probability", "surface_pressure", "boundary_layer_height", "is_day",
].join(",");

type Series = Record<string, (number | null)[]> & { time: string[] };

function normalize(h: Series): HourlyRecord[] {
  const g = (k: string, i: number): number | null => {
    const v = h[k]?.[i];
    return v === undefined || v === null ? null : v;
  };
  return h.time.map((t, i) => {
    const day = g("is_day", i);
    return {
      time: t,
      temp2mC: g("temperature_2m", i),
      temp80mC: g("temperature_80m", i),
      temp120mC: g("temperature_120m", i),
      temp180mC: g("temperature_180m", i),
      wind10mKmh: g("wind_speed_10m", i),
      wind80mKmh: g("wind_speed_80m", i),
      wind120mKmh: g("wind_speed_120m", i),
      wind180mKmh: g("wind_speed_180m", i),
      windDir10mDeg: g("wind_direction_10m", i),
      windDir80mDeg: g("wind_direction_80m", i),
      windDir120mDeg: g("wind_direction_120m", i),
      windDir180mDeg: g("wind_direction_180m", i),
      gust10mKmh: g("wind_gusts_10m", i),
      rhPct: g("relative_humidity_2m", i),
      dewPointC: g("dew_point_2m", i),
      cloudPct: g("cloud_cover", i),
      precipMm: g("precipitation", i),
      precipProbPct: g("precipitation_probability", i),
      pressureHpa: g("surface_pressure", i),
      boundaryLayerM: g("boundary_layer_height", i),
      isDay: day === null ? null : day === 1,
    };
  });
}

const base = (lat: number, lon: number) =>
  `latitude=${lat}&longitude=${lon}&hourly=${HOURLY}&timezone=America/Phoenix&wind_speed_unit=kmh&temperature_unit=celsius`;

/** 7 days hourly (starting today, local). Use when: serving /api/now and /api/forecast. */
export async function fetchOpenMeteoForecast(lat: number, lon: number, timeoutMs = 4000): Promise<HourlyRecord[]> {
  const j = (await fetchJson(
    `https://api.open-meteo.com/v1/forecast?${base(lat, lon)}&forecast_days=7`,
    timeoutMs,
  )) as { hourly: Series };
  return normalize(j.hourly);
}

/** Historical-forecast archive, dates "YYYY-MM-DD" inclusive (valid 2024-01-01..2026-11-01). Use when: calibration (W3). */
export async function fetchOpenMeteoHistorical(
  lat: number, lon: number, startDate: string, endDate: string, timeoutMs = 30000,
): Promise<HourlyRecord[]> {
  const j = (await fetchJson(
    `https://historical-forecast-api.open-meteo.com/v1/forecast?${base(lat, lon)}&start_date=${startDate}&end_date=${endDate}`,
    timeoutMs,
  )) as { hourly: Series };
  return normalize(j.hourly);
}
