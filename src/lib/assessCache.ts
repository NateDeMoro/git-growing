// Memoized assess() for sim playback. Use when: a frame is assessed repeatedly (playback, charts, log scan, 3D props).
// Keyed by product + mode + frame key (frame time). Switching product drops the old product's entries so status never lags.
import type { Assessment, AssessMode, Product, SceneFrame } from "./contract";
import { assess } from "./engine/assess";

const cache = new Map<string, Assessment>();
let owner = "";

/** Use when: you need the (full or single-station) assessment for a sim frame. `key` must be unique per frame. */
export function cachedAssess(frame: SceneFrame, product: Product, mode: AssessMode, key: string): Assessment {
  if (product.id !== owner) {
    cache.clear();
    owner = product.id;
  }
  const k = `${mode}|${key}`;
  let a = cache.get(k);
  if (!a) {
    a = assess(frame, product, mode);
    cache.set(k, a);
  }
  return a;
}
