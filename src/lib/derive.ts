// Hourly weather record + calibration -> SceneFrame. Pure: no network, no randomness, no machine timezone.
// Use when: building a frame from an Open-Meteo hour (live /api/now, forecast, scripts/build-sim.ts).
import * as SunCalc from "suncalc";
import type { Derived, DriftVector, Layer, SceneFrame } from "./contract";
import { SITE } from "./site";

/** Heights of the layers in a frame, ascending. 5 and 30 ft are the tower sensors. */
export const LAYER_HEIGHTS_FT = [5, 15, 30, 60, 100, 160, 260] as const;

/** Fixed offset: America/Phoenix has no DST. */
export const PHOENIX_OFFSET_MIN = -7 * 60;

/** One hour (or one interpolated instant) of metric Open-Meteo data. */
export interface HourlyRecord {
  time: string; // local "YYYY-MM-DDTHH:mm" (America/Phoenix)
  t2mC: number;
  t80mC: number;
  ws10Kmh: number;
  ws80Kmh: number;
  wd10Deg: number;
  wd80Deg: number;
  rhPct: number;
  cloudPct: number;
  precipMm: number; // mm in the hour (treated as a rate in mm/hr)
  gustKmh: number;
  pressureHpa: number;
  pressureTrendHpaPerHr?: number;
  rainProbNext2hPct?: number;
}

export interface Calibration {
  k: number;
  medianExponent: number;
  [extra: string]: unknown;
}

export interface DeriveOptions {
  inversionForecastNext12h?: boolean;
  mode?: SceneFrame["mode"];
  source?: string;
}

const FT_TO_M = 0.3048;
const KMH_TO_MPH = 0.621371;
const MM_TO_IN = 1 / 25.4;
const T_REF_M = 2;
const T_TOP_M = 80;
const WIND_REF_M = 10;
const WIND_TOP_M = 80;

export const cToF = (c: number) => (c * 9) / 5 + 32;
export const fToC = (f: number) => ((f - 32) * 5) / 9;

/** Smallest angle between two bearings, 0-180. */
export function angularDiffDeg(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/** Point `frac` of the way from a to b along the shortest arc; result in [0, 360). */
export function lerpAngleDeg(a: number, b: number, frac: number): number {
  const diff = ((b - a + 540) % 360) - 180;
  return (((a + diff * frac) % 360) + 360) % 360;
}

/** Power-law wind: speed at height h from a reference speed at refH. */
export function powerLaw(refSpeed: number, refH: number, h: number, exponent: number): number {
  return refSpeed * Math.pow(h / refH, exponent);
}

/** Fraction (0 at lowM, 1 at highM) of a log-height interpolation. */
export function logFraction(h: number, lowM: number, highM: number): number {
  return Math.log(h / lowM) / Math.log(highM / lowM);
}

/** Power-law exponent from two speeds. Clamped; falls back to `fallback` when either is near zero. */
export function fitExponent(ws10: number, ws80: number, fallback: number): number {
  if (ws10 < 2 || ws80 < 2) return fallback;
  const a = Math.log(ws80 / ws10) / Math.log(WIND_TOP_M / WIND_REF_M);
  return Math.min(0.6, Math.max(0.05, a));
}

/** Temperature (C) at height hM: T2 below 2 m, log interpolation toward 80 m with departure scaled by k. */
export function tempAtHeightC(t2: number, t80: number, hM: number, k: number): number {
  if (hM <= T_REF_M) return t2;
  return t2 + k * (t80 - t2) * logFraction(Math.min(hM, T_TOP_M), T_REF_M, T_TOP_M);
}

/** Wind direction at height hM: 10 m direction below 10 m, log blend on the shortest arc up to 80 m. */
export function dirAtHeightDeg(d10: number, d80: number, hM: number): number {
  if (hM <= WIND_REF_M) return d10;
  return lerpAngleDeg(d10, d80, logFraction(Math.min(hM, WIND_TOP_M), WIND_REF_M, WIND_TOP_M));
}

/** Stull (2011) wet bulb, C. TODO: switch to W2's wetbulb.ts once merged. */
export function wetBulbC(tC: number, rhPct: number): number {
  const rh = rhPct;
  return (
    tC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(tC + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035
  );
}

/** Local "YYYY-MM-DDTHH:mm" -> epoch ms. */
export function localToMs(local: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) throw new Error(`bad local time: ${local}`);
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - PHOENIX_OFFSET_MIN * 60000;
}

/** Epoch ms -> ISO with fixed -07:00 offset (no machine timezone). */
export function msToIso(ms: number): string {
  return new Date(ms + PHOENIX_OFFSET_MIN * 60000).toISOString().slice(0, 19) + "-07:00";
}

/** Summary values from the 5 ft and 30 ft layers plus RH. Use when: layers were edited and the summary must follow. */
export function summarize(layers: Layer[], rhPct: number): Derived {
  const lo = layers.find((l) => l.heightFt === 5)!;
  const up = layers.find((l) => l.heightFt === 30)!;
  const dT = lo.tempF - cToF(wetBulbC(fToC(lo.tempF), rhPct));
  return {
    inversionF: up.tempF - lo.tempF,
    speedShearMph: Math.abs(up.windMph - lo.windMph),
    dirShearDeg: angularDiffDeg(up.windDirDeg, lo.windDirDeg),
    deltaTC: (dT * 5) / 9,
    rhPct,
  };
}

/** Drift vector: downwind of the 30 ft wind; strength rises with inversion and wind (presentation only). */
export function driftVector(layers: Layer[]): DriftVector {
  const up = layers.find((l) => l.heightFt === 30)!;
  const lo = layers.find((l) => l.heightFt === 5)!;
  const inv = Math.max(0, up.tempF - lo.tempF);
  const strength = Math.min(1, 0.15 + 0.2 * Math.min(inv, 4) + 0.03 * up.windMph);
  return { towardDeg: (up.windDirDeg + 180) % 360, strength };
}

export function sunInfo(ms: number) {
  const { lat, lon } = SITE.tower;
  const noonLocal = Math.floor((ms + PHOENIX_OFFSET_MIN * 60000) / 86400000) * 86400000 + 12 * 3600000 - PHOENIX_OFFSET_MIN * 60000;
  const times = SunCalc.getTimes(new Date(noonLocal), lat, lon);
  const elev = (SunCalc.getPosition(new Date(ms), lat, lon).altitude * 180) / Math.PI;
  return {
    elevationDeg: elev,
    isDay: elev > 0,
    sunriseIso: msToIso(times.sunrise!.getTime()),
    sunsetIso: msToIso(times.sunset!.getTime()),
  };
}

/** One hourly record plus calibration -> SceneFrame (mode "forecast" by default). */
export function deriveFrame(rec: HourlyRecord, cal: Calibration, opts: DeriveOptions = {}): SceneFrame {
  const ms = localToMs(rec.time);
  const alpha = fitExponent(rec.ws10Kmh, rec.ws80Kmh, cal.medianExponent);
  const layers: Layer[] = LAYER_HEIGHTS_FT.map((ft) => {
    const hM = ft * FT_TO_M;
    return {
      heightFt: ft,
      tempF: cToF(tempAtHeightC(rec.t2mC, rec.t80mC, hM, cal.k)),
      windMph: powerLaw(rec.ws10Kmh, WIND_REF_M, hM, alpha) * KMH_TO_MPH,
      windDirDeg: dirAtHeightDeg(rec.wd10Deg, rec.wd80Deg, hM),
    };
  });
  const sun = sunInfo(ms);
  const frame: SceneFrame = {
    time: msToIso(ms),
    mode: opts.mode ?? "forecast",
    tower: { lowerFt: 5, upperFt: 30 },
    layers,
    derived: summarize(layers, rec.rhPct),
    sun,
    weather: {
      cloudPct: rec.cloudPct,
      rainInHr: rec.precipMm * MM_TO_IN,
      rainProbNext2hPct: rec.rainProbNext2hPct ?? 0,
      gustMph: rec.gustKmh * KMH_TO_MPH,
      pressureHpa: rec.pressureHpa,
      pressureTrendHpaPerHr: rec.pressureTrendHpaPerHr ?? 0,
    },
    drift: driftVector(layers),
    context: { inversionForecastNext12h: opts.inversionForecastNext12h ?? false },
    source: opts.source ?? "open-meteo",
  };
  return frame;
}
