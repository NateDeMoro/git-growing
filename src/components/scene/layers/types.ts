// Shared context for layer builders. Use when: writing a builder under layers/.
import type { Assessment, Layer, SceneFrame } from "@/lib/contract";
import type { PathBuf } from "../sim";
import type { DriftBehavior } from "@/lib/scene/drift";

export interface SceneCtx {
  frame: SceneFrame;
  assessment: Assessment;
  layers: Layer[]; // eased
  ver: number; // bumps when eased layers change
  tSec: number;
  focusId: string;
  flat: boolean; // 2D mode
  origin: [number, number]; // tower lon,lat
  lidFt: number | null;
  tMin: number;
  tMax: number;
  trees: Float32Array; // local x,y pairs
  behavior: DriftBehavior;
  wind: PathBuf;
  drift: PathBuf;
  rain: PathBuf;
  driftN: number;
  rainN: number;
  windN: number;
  gustLen: number;
  stormLevel: number;
  onFocus: (id: string) => void;
}
