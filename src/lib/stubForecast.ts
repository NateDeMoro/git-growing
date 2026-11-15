// TEMPORARY local window merge so the Forecast tab works before W5's forecast.ts. W6 deletes this file.
import type { ForecastResult, ForecastWindow, SceneFrame, Status } from "./contract";

const RANK: Record<Status, number> = { GO: 0, CAUTION: 1, STOP: 2 };
const HOUR = 3600_000;

export function mergeWindows(frames: SceneFrame[], statuses: Status[], tops: (string | undefined)[]): ForecastWindow[] {
  const out: ForecastWindow[] = [];
  frames.forEach((f, i) => {
    const last = out[out.length - 1];
    const end = new Date(new Date(f.time).getTime() + HOUR).toISOString();
    if (last && last.status === statuses[i]) last.end = end;
    else out.push({ start: f.time, end, status: statuses[i], topReason: tops[i] });
  });
  return out;
}

export function buildForecast(frames: SceneFrame[], statuses: Status[], tops: (string | undefined)[]): ForecastResult {
  const windows = mergeWindows(frames, statuses, tops);
  const nextSafeWindow = windows.find((w) => w.status === "GO" && new Date(w.end).getTime() - new Date(w.start).getTime() >= 2 * HOUR) ?? null;
  let earlyWarning: ForecastResult["earlyWarning"] = null;
  for (let i = 1; i <= 6 && i < frames.length; i++) {
    if (RANK[statuses[i]] > RANK[statuses[0]]) {
      earlyWarning = { at: frames[i].time, status: statuses[i], reason: tops[i] ?? "conditions worsen" };
      break;
    }
  }
  return { frames, windows, nextSafeWindow, earlyWarning, source: "mock48", cached: true };
}
