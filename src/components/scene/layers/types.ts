// Shared context for layer builders. Use when: writing a builder under layers/.
import type { Assessment, Layer, SceneFrame } from "@/lib/contract";
import type { PathBuf } from "../sim";

export interface SceneCtx {
  frame: SceneFrame;
  assessment: Assessment;
  layers: Layer[]; // eased
  ver: number; // bumps when eased layers change
  tSec: number;
  focusId: string;
  flat: boolean; // 2D mode
  origin: [number, number]; // tower lon,lat
  tMin: number;
  tMax: number;
  trees: Float32Array; // local x,y pairs
  wind: PathBuf;
  rain: PathBuf;
  rainN: number;
  windN: number;
  gustLen: number;
  stormLevel: number;
  onFocus: (id: string) => void;
}
