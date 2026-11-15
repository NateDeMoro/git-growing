// TEMPORARY stub assessment so W4 can show all three colors. W6 DELETES this file and swaps the one import
// (src/components/ui/UiData.tsx) to the real assess() from the engine. Do not extend.
import type { Assessment, AssessMode, Product, Reason, SceneFrame, SourceRef, Status } from "./contract";
import { dropletInfo } from "./droplets";
import { SOURCES, T } from "./thresholds";

const RANK: Record<Status, number> = { GO: 0, CAUTION: 1, STOP: 2 };

export function stubAssess(frame: SceneFrame, product: Product, mode: AssessMode = "full"): Assessment {
  const lo = frame.layers.find((l) => l.heightFt === 5)!;
  const up = frame.layers.find((l) => l.heightFt === 30)!;
  const d = frame.derived;
  const w = frame.weather;
  const max = product.labelWindMaxMph;
  const reasons: Reason[] = [];
  const add = (ruleId: string, status: Status, text: string, source: SourceRef) => reasons.push({ ruleId, status, text, source });
  const full = mode === "full";

  const inverted = full && d.inversionF > 0;
  if (full && d.inversionF >= T.inversion.stopF) {
    add("inversion", "STOP", `It is ${d.inversionF.toFixed(1)}°F warmer at 30 ft than at 5 ft: an inversion is trapping spray near the ground.`, SOURCES.battany2017);
  } else if (inverted) {
    add("inversion", product.volatility === "high" ? "STOP" : "CAUTION", `Weak inversion: ${d.inversionF.toFixed(1)}°F warmer at 30 ft than at 5 ft.`, SOURCES.battany2017);
  }
  const heights = full ? [lo, up] : [lo];
  for (const l of heights) {
    if (l.windMph < T.wind.minMph) {
      add("windLow", inverted ? "STOP" : "CAUTION", `Wind at ${l.heightFt} ft is ${l.windMph.toFixed(1)} mph, under the ${T.wind.minMph} mph minimum.`, SOURCES.labelWind);
    } else if (l.windMph >= max) {
      add("windHigh", "STOP", `Wind at ${l.heightFt} ft is ${l.windMph.toFixed(1)} mph, at or over the ${max} mph label maximum.`, SOURCES.labelWind);
    } else if (l.windMph >= max - T.wind.nearMaxMarginMph) {
      add("windHigh", "CAUTION", `Wind at ${l.heightFt} ft is ${l.windMph.toFixed(1)} mph, within ${T.wind.nearMaxMarginMph} mph of the ${max} mph maximum.`, SOURCES.labelWind);
    }
  }
  if (w.gustMph >= max + T.gust.stopOverMaxMph) add("gust", "STOP", `Gusts reach ${w.gustMph.toFixed(0)} mph, ${T.gust.stopOverMaxMph}+ mph over the ${max} mph maximum.`, SOURCES.heuristic);
  else if (w.gustMph > max) add("gust", "CAUTION", `Gusts reach ${w.gustMph.toFixed(0)} mph, over the ${max} mph maximum.`, SOURCES.heuristic);
  if (full) {
    if (d.speedShearMph >= T.speedShear.stopMph) add("speedShear", "STOP", `Wind speed differs by ${d.speedShearMph.toFixed(1)} mph between 5 ft and 30 ft.`, SOURCES.heuristic);
    else if (d.speedShearMph >= T.speedShear.cautionMph) add("speedShear", "CAUTION", `Wind speed differs by ${d.speedShearMph.toFixed(1)} mph between 5 ft and 30 ft.`, SOURCES.heuristic);
    if (lo.windMph >= T.dirShear.minSpeedMph && up.windMph >= T.dirShear.minSpeedMph) {
      if (d.dirShearDeg >= T.dirShear.stopDeg) add("dirShear", "STOP", `Wind direction differs by ${d.dirShearDeg.toFixed(0)}° between 5 ft and 30 ft.`, SOURCES.heuristic);
      else if (d.dirShearDeg >= T.dirShear.cautionDeg) add("dirShear", "CAUTION", `Wind direction differs by ${d.dirShearDeg.toFixed(0)}° between 5 ft and 30 ft.`, SOURCES.heuristic);
    }
  }
  if (w.rainInHr > T.rain.stopAboveInHr) add("rain", "STOP", `Raining at ${w.rainInHr.toFixed(2)} in/hr.`, SOURCES.amsRain);
  else if (w.rainInHr > 0) add("rain", "CAUTION", `Light rain, ${w.rainInHr.toFixed(2)} in/hr.`, SOURCES.amsRain);
  if (w.pressureTrendHpaPerHr <= T.pressure.fallingRapidlyHpaPerHr) add("pressure", "CAUTION", `Storm approaching: pressure falling ${Math.abs(w.pressureTrendHpaPerHr).toFixed(1)} hPa per hour.`, SOURCES.presfr);

  reasons.sort((a, b) => RANK[b.status] - RANK[a.status]);
  const status: Status = reasons.reduce<Status>((s, r) => (RANK[r.status] > RANK[s] ? r.status : s), "GO");
  if (status === "GO") add("ok", "GO", "Wind, temperature layers and weather are inside the limits.", SOURCES.track);
  const recommendedDroplet = status === "STOP" ? null : product.labelMinDroplet;
  return {
    status,
    reasons,
    recommendedDroplet,
    dropletNote:
      recommendedDroplet === null
        ? "No droplet size makes this safe right now."
        : `Use ${dropletInfo(recommendedDroplet).name} or larger (${dropletInfo(recommendedDroplet).howToGet}).`,
    mode,
  };
}
