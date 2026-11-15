// Client-side forecast: fetch /api/forecast once (memoized), derive hourly frames, assess, merge into windows.
// Use when: the Forecast tab or the live frame needs hourly frames, windows, next safe window or early warning.
import type { Assessment, ForecastResult, ForecastWindow, Product, SceneFrame, Status } from "./contract";
import type { HourlyRecord, NwsHour } from "./data/types";
import { assess } from "./engine/assess";
import { msToIso } from "./derive";
import { framesFromHourly, nwsOverlay } from "./liveFrames";

const RANK: Record<Status, number> = { GO: 0, CAUTION: 1, STOP: 2 };
const HOUR = 3600_000;
const TTL_MS = 5 * 60_000;

export interface ForecastData {
  hourly: HourlyRecord[];
  nws: NwsHour[];
  source: string;
  cached: boolean;
}

let memo: { at: number; p: Promise<ForecastData | null> } | null = null;

/** Use when: you need the raw hourly forecast. Memoized for 5 minutes; resolves null on network failure (never throws). */
export function fetchForecastData(): Promise<ForecastData | null> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.p;
  const p = fetch("/api/forecast")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j): ForecastData => ({
      hourly: j.data.hourly,
      nws: j.data.nws ?? [],
      source: j.source,
      cached: j.source === "snapshot" || j.nwsSource === "snapshot",
    }))
    .catch(() => {
      memo = null;
      return null;
    });
  memo = { at: Date.now(), p };
  return p;
}

/** Merge consecutive same-status hours into windows. Use when: building the strip and the next-safe-window card. */
export function mergeWindows(frames: SceneFrame[], assessments: Assessment[]): ForecastWindow[] {
  const out: ForecastWindow[] = [];
  frames.forEach((f, i) => {
    const s = assessments[i].status;
    const end = msToIso(Date.parse(f.time) + HOUR);
    const last = out[out.length - 1];
    if (last && last.status === s) last.end = end;
    else out.push({ start: f.time, end, status: s, topReason: assessments[i].reasons[0]?.text });
  });
  return out;
}

/** Use when: a product is picked or the data arrives. Starts at the current Phoenix hour (or the data start if stale). */
export function buildForecast(data: ForecastData, product: Product, nowMs: number): ForecastResult {
  const nowHour = new Date(nowMs - 7 * HOUR).toISOString().slice(0, 13) + ":00";
  const all = framesFromHourly(data.hourly, "forecast", data.source, data.cached);
  const start = Math.max(0, data.hourly.findIndex((h) => h.time >= nowHour));
  const frames = all.slice(start, start + 168);
  const assessments = frames.map((f) => assess(f, product, "full"));
  const windows = mergeWindows(frames, assessments);
  const nextSafeWindow = windows.find((w) => w.status === "GO" && Date.parse(w.end) - Date.parse(w.start) >= 2 * HOUR) ?? null;
  let earlyWarning: ForecastResult["earlyWarning"] = null;
  for (let i = 1; i <= 6 && i < frames.length; i++) {
    if (RANK[assessments[i].status] > RANK[assessments[0].status]) {
      earlyWarning = { at: frames[i].time, status: assessments[i].status, reason: assessments[i].reasons[0]?.text ?? "conditions worsen" };
      break;
    }
  }
  return { frames, windows, nextSafeWindow, earlyWarning, nws: nwsOverlay(data.nws), source: data.source, cached: data.cached };
}

export const EMPTY_FORECAST: ForecastResult = { frames: [], windows: [], nextSafeWindow: null, earlyWarning: null, source: "loading", cached: false };
