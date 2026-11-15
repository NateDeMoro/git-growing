// Inversion lid height. Use when: placing the lid sheet or capping drift under it.
import type { SceneFrame } from "../contract";

/** Height (ft) of the warmest layer at or below 100 ft when inverted; null when not inverted. */
export function lidHeightFt(frame: Pick<SceneFrame, "layers" | "derived">): number | null {
  if (!(frame.derived.inversionF > 0)) return null;
  let best: { h: number; t: number } | null = null;
  for (const l of frame.layers) {
    if (l.heightFt > 100) continue;
    if (!best || l.tempF > best.t) best = { h: l.heightFt, t: l.tempF };
  }
  return best ? best.h : null;
}
