// Forecast pipeline: Open-Meteo hours -> derived frames -> per-hour assess -> windows, next GO window, early warning.
// Pure (no fetch). Use when: /api/now and /api/forecast build frames server-side; W6 runs buildForecast client-side per product.
import type { Assessment, ForecastResult, ForecastWindow, Product, SceneFrame, Status } from "./contract";
import { type Calibration, type HourlyRecord as DeriveRecord, deriveFrame, driftVector, localToMs, msToIso, summarize } from "./derive";
import type { HourlyRecord, NwsHour } from "./data/types";
import { assess } from "./engine/assess";

const HOUR = 3600_000;
const RANK: Record<Status, number> = { GO: 0, CAUTION: 1, STOP: 2 };
const KMH_TO_MPH = 0.621371;
const M_TO_FT = 3.28084;

/** W1 metric hours -> derive records. Nulls fall back to the nearest available level; hours with no 2 m temp or 10 m wind are dropped. */
export function toDeriveRecords(hourly: HourlyRecord[]): DeriveRecord[] {
  const base = hourly.filter((h) => h.temp2mC !== null && h.wind10mKmh !== null);
  return base.map((h, i) => {
    const prev = base[i - 1]?.pressureHpa;
    const next = base[i + 1]?.pressureHpa;
    const p = h.pressureHpa ?? prev ?? next ?? 1013;
    const trend = prev != null && h.pressureHpa != null ? h.pressureHpa - prev : next != null && h.pressureHpa != null ? next - h.pressureHpa : 0;
    const probs = base.slice(i, i + 3).map((x) => x.precipProbPct ?? 0);
    return {
      time: h.time,
      t2mC: h.temp2mC!,
      t80mC: h.temp80mC ?? h.temp120mC ?? h.temp2mC!,
      ws10Kmh: h.wind10mKmh!,
      ws80Kmh: h.wind80mKmh ?? h.wind120mKmh ?? h.wind10mKmh!,
      wd10Deg: h.windDir10mDeg ?? h.windDir80mDeg ?? 0,
      wd80Deg: h.windDir80mDeg ?? h.windDir10mDeg ?? 0,
      rhPct: h.rhPct ?? 50,
      cloudPct: h.cloudPct ?? 0,
      precipMm: h.precipMm ?? 0,
      gustKmh: h.gust10mKmh ?? h.wind10mKmh!,
      pressureHpa: p,
      pressureTrendHpaPerHr: trend,
      rainProbNext2hPct: Math.max(...probs),
    };
  });
}

/**
 * One derived frame per hour. Sets context.inversionForecastNext12h (any of the next 12 hours has inversion > 0)
 * and weather.rainProbNext2hPct. Use when: building forecast or "now" frames from fetched hours.
 */
export function deriveForecastFrames(
  hourly: HourlyRecord[],
  cal: Calibration,
  opts: { source?: string; cached?: boolean; mode?: SceneFrame["mode"] } = {},
): SceneFrame[] {
  const frames = toDeriveRecords(hourly).map((r) => deriveFrame(r, cal, { mode: opts.mode ?? "forecast", source: opts.source }));
  frames.forEach((f, i) => {
    f.context.inversionForecastNext12h = frames.slice(i + 1, i + 13).some((g) => g.derived.inversionF > 0);
    if (opts.cached !== undefined) f.cached = opts.cached;
  });
  return frames;
}

/** Index of the frame for `nowHour` ("YYYY-MM-DDTHH:00" local). Falls back to the same hour of day, then 0 (stale snapshot). */
export function nowIndexFor(frames: SceneFrame[], nowHour: string): number {
  const ms = localToMs(nowHour);
  let i = frames.findIndex((f) => Date.parse(f.time) === ms);
  if (i < 0) i = frames.findIndex((f) => f.time.slice(11, 13) === nowHour.slice(11, 13));
  return Math.max(i, 0);
}

/** Merge consecutive same-status hours (contiguous in time) into windows. */
export function mergeWindows(frames: SceneFrame[], assessments: Pick<Assessment, "status" | "reasons">[]): ForecastWindow[] {
  const out: ForecastWindow[] = [];
  frames.forEach((f, i) => {
    const a = assessments[i];
    const start = Date.parse(f.time);
    const last = out[out.length - 1];
    if (last && last.status === a.status && Date.parse(last.end) === start) last.end = msToIso(start + HOUR);
    else out.push({ start: msToIso(start), end: msToIso(start + HOUR), status: a.status, topReason: a.reasons[0]?.text });
  });
  return out;
}

/** First GO window lasting at least `minHours`, or null. */
export function nextSafeWindow(windows: ForecastWindow[], minHours = 2): ForecastWindow | null {
  return windows.find((w) => w.status === "GO" && Date.parse(w.end) - Date.parse(w.start) >= minHours * HOUR) ?? null;
}

/** First hour within the next `horizon` hours (after index 0) that is worse than hour 0, with its top reason. */
export function earlyWarning(
  frames: SceneFrame[],
  assessments: Pick<Assessment, "status" | "reasons">[],
  horizon = 6,
): ForecastResult["earlyWarning"] {
  for (let i = 1; i <= horizon && i < frames.length; i++) {
    if (RANK[assessments[i].status] > RANK[assessments[0].status]) {
      const w = frames[i].weather;
      const storm = w.rainInHr > 0 || w.pressureTrendHpaPerHr <= -2;
      return { at: frames[i].time, status: assessments[i].status, reason: assessments[i].reasons[0]?.text ?? "Conditions worsen", hours: i, storm };
    }
  }
  return null;
}

/** One-line early-warning text, e.g. "Storm arriving in 2 hours: STOP". Use when: any tab shows the early warning (single wording). */
export function earlyWarningLine(ew: NonNullable<ForecastResult["earlyWarning"]>): string {
  const h = ew.hours ?? 1;
  return `${ew.storm ? "Storm arriving" : "Conditions worsen"} in ${h} hour${h > 1 ? "s" : ""}: ${ew.status}`;
}

/** NWS hours -> overlay entries aligned to frame times (context only, never an assess input). */
export function nwsOverlay(nws: NwsHour[], frames: SceneFrame[]): NonNullable<ForecastResult["nws"]> {
  const times = new Set(frames.map((f) => Date.parse(f.time)));
  return nws
    .filter((n) => times.has(localToMs(n.time)))
    .map((n) => ({
      time: msToIso(localToMs(n.time)),
      mixingHeightFt: n.mixingHeightM == null ? undefined : n.mixingHeightM * M_TO_FT,
      transportWindMph: n.transportWindKmh == null ? undefined : n.transportWindKmh * KMH_TO_MPH,
    }));
}

/** Windows, next safe window and early warning from precomputed assessments. Frames start at "now". */
export function summarizeForecast(
  frames: SceneFrame[],
  assessments: Pick<Assessment, "status" | "reasons">[],
  extra: { nws?: ForecastResult["nws"]; source?: string; cached?: boolean } = {},
): ForecastResult {
  const windows = mergeWindows(frames, assessments);
  return {
    frames,
    windows,
    nextSafeWindow: nextSafeWindow(windows),
    earlyWarning: earlyWarning(frames, assessments),
    nws: extra.nws,
    source: extra.source ?? "open-meteo",
    cached: extra.cached ?? false,
  };
}

/** Assess every frame from nowIndex on (full mode) for one product and summarize. Use when: product or frames changed (memoize in the UI). */
export function buildForecast(
  allFrames: SceneFrame[],
  product: Product,
  opts: { nowIndex?: number; nws?: ForecastResult["nws"]; source?: string; cached?: boolean } = {},
): ForecastResult {
  const frames = allFrames.slice(opts.nowIndex ?? 0);
  return summarizeForecast(frames, frames.map((f) => assess(f, product, "full")), opts);
}

/** Deterministic hash of a string to [0,1). Use when: seeding the live wobble from the minute. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/**
 * Minute-seeded common-mode wobble: one temp offset (+-0.2 F) and one wind offset (+-0.3 mph) applied to every layer,
 * so inversion and speed shear are unchanged. Wind offset is 0 when the 5 ft or 30 ft wind is within 0.3 mph of 3 or 10 mph.
 * Deterministic per minute key, no Math.random. Use when: serving a live "now" frame.
 */
export function wobbleFrame(frame: SceneFrame, minuteKey: string): SceneFrame {
  const dT = (hash01(`${minuteKey}|t`) * 2 - 1) * 0.2;
  let dW = (hash01(`${minuteKey}|w`) * 2 - 1) * 0.3;
  const nearCutoff = frame.layers.some(
    (l) => (l.heightFt === 5 || l.heightFt === 30) && [3, 10].some((c) => Math.abs(l.windMph - c) <= 0.3),
  );
  if (nearCutoff) dW = 0;
  const layers = frame.layers.map((l) => ({ ...l, tempF: l.tempF + dT, windMph: Math.max(0, l.windMph + dW) }));
  return { ...frame, layers, derived: summarize(layers, frame.derived.rhPct), drift: driftVector(layers) };
}
