// Drift behaviour from a frame and assessment. Use when: deciding how drift particles rise, spread and travel.
import type { Assessment, SceneFrame } from "../contract";
import { lidHeightFt } from "./lid";

export type DriftRegime = "inversion" | "storm" | "wind" | "go";

export interface DriftBehavior {
  regime: DriftRegime;
  ceilingFt: number | null; // null = no ceiling
  spreadSideways: number; // 0..1, width of the sideways sheet
  riseFtPerS: number; // real-ish rise rate in ft/s (before the 10x factor)
  reachM: number; // how far downwind particles travel before dying
  fadeSpeed: number; // 1 = normal life, bigger = dies faster
}

export function driftBehavior(frame: SceneFrame, assessment: Assessment): DriftBehavior {
  const lid = lidHeightFt(frame);
  const upper = frame.layers.find((l) => l.heightFt === frame.tower.upperFt);
  const wind = upper?.windMph ?? 0;
  const storm = frame.weather.rainInHr >= 0.05 || frame.weather.gustMph >= 30;
  if (storm) {
    return { regime: "storm", ceilingFt: null, spreadSideways: 0.5, riseFtPerS: 6, reachM: 500, fadeSpeed: 3 };
  }
  if (lid !== null) {
    return { regime: "inversion", ceilingFt: lid * 0.8, spreadSideways: 1, riseFtPerS: 1, reachM: 350 + wind * 20, fadeSpeed: 0.5 };
  }
  if (wind >= 10 || assessment.reasons.some((r) => r.ruleId === "windHigh" && r.status !== "GO")) {
    return { regime: "wind", ceilingFt: null, spreadSideways: 0.3, riseFtPerS: 2, reachM: 700 + wind * 30, fadeSpeed: 1 };
  }
  return { regime: "go", ceilingFt: null, spreadSideways: 0.2, riseFtPerS: 5, reachM: 120, fadeSpeed: 1.5 };
}
