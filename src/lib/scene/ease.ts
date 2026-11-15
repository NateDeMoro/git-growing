// Easing between two frames' layers. Use when: playback jumps to a new frame and temps/winds should glide over ~300 ms.
import type { Layer } from "../contract";
import { velocityToWind, windVelocity } from "./wind";

export const EASE_MS = 300;

export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, 3);
}

/** Blend two layer lists (matched by index when heights agree, else by nearest). Wind blends as a vector. */
export function easeLayers(from: Layer[], to: Layer[], t: number): Layer[] {
  const k = easeOutCubic(t);
  return to.map((b, i) => {
    const a = from[i] && from[i].heightFt === b.heightFt ? from[i] : from.find((l) => l.heightFt === b.heightFt) ?? b;
    const va = windVelocity(a.windMph, a.windDirDeg);
    const vb = windVelocity(b.windMph, b.windDirDeg);
    const w = velocityToWind(va.east + (vb.east - va.east) * k, va.north + (vb.north - va.north) * k);
    return {
      heightFt: b.heightFt,
      tempF: a.tempF + (b.tempF - a.tempF) * k,
      windMph: w.mph,
      windDirDeg: w.mph < 0.01 ? b.windDirDeg : w.fromDeg,
    };
  });
}
