// Log-entry builder + deterministic sim logger. Use when: appending status changes / hourly readings to the log.
// The sim logger scans EVERY frame between the last and current playhead, so skipped frames never hide a change.
import { nozzleLabel } from "./nozzles";
import type { Assessment, LogEntry, SceneFrame, Status } from "./contract";

/** Frames per sim-hour at 5-minute steps. */
export const FRAMES_PER_HOUR = 12;
/** A forward move larger than this many frames counts as a seek, not playback (no scan). */
const SCAN_LIMIT = 24 * FRAMES_PER_HOUR;

/** Use when: turning a frame + assessment into a LogEntry. */
export function makeLogEntry(f: SceneFrame, a: Assessment, productId: string, statusChanged: boolean): LogEntry {
  const lo = f.layers.find((l) => l.heightFt === 5)!;
  const up = f.layers.find((l) => l.heightFt === 30)!;
  return {
    time: f.time,
    loggedAt: new Date().toISOString(),
    mode: f.mode,
    status: a.status,
    statusChanged,
    productId,
    recommendedDroplet: a.recommendedDroplet,
    nozzle: nozzleLabel(a.recommendedDroplet),
    triggers: a.reasons.map((r) => r.text),
    lowerTempF: lo.tempF,
    upperTempF: up.tempF,
    lowerWindMph: lo.windMph,
    upperWindMph: up.windMph,
    lowerDirDeg: lo.windDirDeg,
    upperDirDeg: up.windDirDeg,
    deltaTC: f.derived.deltaTC,
    rainInHr: f.weather.rainInHr,
  };
}

export interface SimLoggerDeps {
  frameAt: (i: number) => SceneFrame;
  assessAt: (i: number) => Assessment;
  productId: string;
  append: (e: LogEntry) => void;
}

/** Use when: the sim playhead moves. Logs each status change and the first frame of each sim-hour; dedupes on frame time. */
export function createSimLogger(d: SimLoggerDeps) {
  let last: number | null = null;
  let lastStatus: Status = "GO";
  const done = new Set<string>();

  function emit(i: number, changed: boolean) {
    const f = d.frameAt(i);
    const key = `${f.time}|${f.mode}|${d.productId}`;
    if (done.has(key)) return;
    done.add(key);
    d.append(makeLogEntry(f, d.assessAt(i), d.productId, changed));
  }

  return {
    /** Use when: the log was cleared, so a replay must refill it. */
    reset() {
      done.clear();
    },
    /** Use when: the product changed mid-sim. Logs the status change at `idx` once (if the verdict differs). */
    switchProduct(idx: number, prevStatus: Status) {
      const s = d.assessAt(idx).status;
      last = idx;
      lastStatus = s;
      if (s !== prevStatus) emit(idx, true);
    },
    update(idx: number) {
      if (last === null) {
        last = idx;
        lastStatus = d.assessAt(idx).status;
        return;
      }
      if (idx === last) return;
      if (idx > last && idx - last <= SCAN_LIMIT) {
        for (let i = last + 1; i <= idx; i++) {
          const s = d.assessAt(i).status;
          const changed = s !== lastStatus;
          const hourStart = d.frameAt(i).time.slice(14, 16) === "00";
          if (changed || hourStart) emit(i, changed);
          lastStatus = s;
        }
      } else {
        const s = d.assessAt(idx).status;
        emit(idx, s !== lastStatus);
        lastStatus = s;
      }
      last = idx;
    },
  };
}
