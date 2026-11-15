// AZMet reading -> a one-layer SceneFrame for single-station mode. Use when: the regional station must be assessed.
// Takes sun, cloud and pressure from `base` (AZMet hourly rows do not carry them).
import type { SceneFrame } from "./contract";
import type { StationReading } from "./data/types";
import { wetBulbC } from "./derive";

export function stationFrame(s: StationReading, base: SceneFrame): SceneFrame {
  const tempC = s.tempC ?? (((s.tempF ?? 70) - 32) * 5) / 9;
  const tempF = s.tempF ?? (tempC * 9) / 5 + 32;
  const rh = s.rhPct ?? base.derived.rhPct;
  return {
    ...base,
    layers: [{ heightFt: 5, tempF, windMph: s.windMph ?? 0, windDirDeg: s.windDirDeg ?? 0 }],
    derived: { inversionF: 0, speedShearMph: 0, dirShearDeg: 0, deltaTC: Math.max(0, tempC - wetBulbC(tempC, rh)), rhPct: rh },
    weather: { ...base.weather, rainInHr: (s.precipMm ?? 0) / 25.4, gustMph: s.gustMph ?? s.windMph ?? 0 },
    context: { inversionForecastNext12h: false },
  };
}
