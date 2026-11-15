// The one pure risk engine. Use when: turning a SceneFrame + Product into a status, reasons and droplet advice.
// Pure and deterministic: no I/O, no clock, no randomness, inputs never mutated.
// Every cutoff is read from thresholds.ts (boundary rule: a value AT a cutoff gets the stricter status).
import type {
  Assessment,
  AssessMode,
  DropletClass,
  Product,
  Reason,
  SceneFrame,
  SourceRef,
  Status,
} from "../contract";
import { DROPLET_ORDER, dropletIndex, dropletInfo } from "../droplets";
import { SOURCES, T } from "../thresholds";
import { inInversionWindow } from "./sun";

const RANK: Record<Status, number> = { GO: 0, CAUTION: 1, STOP: 2 };
const r1 = (n: number) => (Math.round(n * 10) / 10).toString();
const r2 = (n: number) => (Math.round(n * 100) / 100).toString();

function worse(a: Status, b: Status): Status {
  return RANK[b] > RANK[a] ? b : a;
}

function reason(ruleId: string, status: Status, text: string, source: SourceRef): Reason {
  return { ruleId, status, text, source };
}

function layerAt(frame: SceneFrame, ft: number) {
  const ls = frame.layers;
  for (let i = 0; i < ls.length; i++) if (ls[i].heightFt === ft) return ls[i];
  return undefined;
}

const VC_INDEX = dropletIndex("VC");

/** Delta T 10 to 12 C rule at one droplet class (the only weather rule that depends on class). */
function deltaTBand(dt: number): "low" | "ok" | "high" | "over" {
  if (dt < T.deltaT.cautionBelowC) return "low";
  if (dt >= T.deltaT.stopAboveC) return "over";
  if (dt >= T.deltaT.cautionFromC) return "high";
  return "ok";
}

/**
 * Assess one frame for one product.
 * Use when: live readings, sim playback or forecast hours need a verdict. mode "singleStation" uses 5 ft data only.
 */
export function assess(frame: SceneFrame, product: Product, mode: AssessMode = "full"): Assessment {
  const full = mode === "full";
  const d = frame.derived;
  const w = frame.weather;
  const lower = layerAt(frame, frame.tower.lowerFt);
  const upper = layerAt(frame, frame.tower.upperFt);
  const maxWind = product.labelWindMaxMph ?? T.wind.defaultMaxMph;
  const rs: Reason[] = [];

  const inv = full ? d.inversionF : 0;
  const hasInversion = inv > T.inversion.cautionAboveF;

  // Inversion
  if (full) {
    if (inv >= T.inversion.stopF) {
      rs.push(reason("inversion", "STOP", `It is ${r1(inv)}°F warmer at ${frame.tower.upperFt} ft than at ${frame.tower.lowerFt} ft: a temperature inversion traps spray near the ground, and no droplet size fixes that.`, SOURCES.battany2017));
    } else if (hasInversion) {
      rs.push(reason("inversion", "CAUTION", `A weak inversion is starting: ${r1(inv)}°F warmer at ${frame.tower.upperFt} ft than at ${frame.tower.lowerFt} ft.`, SOURCES.track));
    }
  }

  // Wind window, per height
  const heights: { name: string; mph: number }[] = [];
  if (lower) heights.push({ name: `${lower.heightFt} ft`, mph: lower.windMph });
  if (full && upper) heights.push({ name: `${upper.heightFt} ft`, mph: upper.windMph });
  let lowWind: Reason | null = null;
  let highWind: Reason | null = null;
  for (const h of heights) {
    if (h.mph < T.wind.minMph) {
      const st: Status = hasInversion ? "STOP" : "CAUTION";
      if (!lowWind || RANK[st] > RANK[lowWind.status]) {
        lowWind = reason("windLow", st, hasInversion
          ? `Wind at ${h.name} is only ${r1(h.mph)} mph (under ${T.wind.minMph} mph) with an inversion present: spray hangs in the air and drifts unpredictably.`
          : `Wind at ${h.name} is only ${r1(h.mph)} mph (under ${T.wind.minMph} mph): too calm for reliable spray movement.`, SOURCES.labelWind);
      }
    } else if (h.mph >= maxWind) {
      const st: Status = "STOP";
      if (!highWind || RANK[st] > RANK[highWind.status]) {
        highWind = reason("windHigh", st, `Wind at ${h.name} is ${r1(h.mph)} mph, at or over the ${r1(maxWind)} mph label maximum.`, SOURCES.labelWind);
      }
    } else if (h.mph >= maxWind - T.wind.nearMaxMarginMph) {
      if (!highWind) {
        highWind = reason("windHigh", "CAUTION", `Wind at ${h.name} is ${r1(h.mph)} mph, within ${T.wind.nearMaxMarginMph} mph of the ${r1(maxWind)} mph label maximum.`, SOURCES.heuristic);
      }
    }
  }
  if (lowWind) rs.push(lowWind);
  if (highWind) rs.push(highWind);

  // Gusts
  if (w.gustMph > maxWind) {
    const over = w.gustMph - maxWind;
    if (over >= T.gust.stopOverMaxMph) {
      rs.push(reason("gust", "STOP", `Gusts reach ${r1(w.gustMph)} mph, ${r1(over)} mph over the ${r1(maxWind)} mph label maximum.`, SOURCES.heuristic));
    } else {
      rs.push(reason("gust", "CAUTION", `Gusts reach ${r1(w.gustMph)} mph, over the ${r1(maxWind)} mph label maximum.`, SOURCES.heuristic));
    }
  }

  // Shear (needs both heights)
  if (full) {
    if (d.speedShearMph >= T.speedShear.stopMph) {
      rs.push(reason("speedShear", "STOP", `Wind speed differs by ${r1(d.speedShearMph)} mph between ${frame.tower.lowerFt} ft and ${frame.tower.upperFt} ft: spray will be carried unevenly.`, SOURCES.heuristic));
    } else if (d.speedShearMph >= T.speedShear.cautionMph) {
      rs.push(reason("speedShear", "CAUTION", `Wind speed differs by ${r1(d.speedShearMph)} mph between ${frame.tower.lowerFt} ft and ${frame.tower.upperFt} ft.`, SOURCES.track));
    }
    if (lower && upper && lower.windMph >= T.dirShear.minSpeedMph && upper.windMph >= T.dirShear.minSpeedMph) {
      if (d.dirShearDeg >= T.dirShear.stopDeg) {
        rs.push(reason("dirShear", "STOP", `Wind direction differs by ${Math.round(d.dirShearDeg)}° between ${frame.tower.lowerFt} ft and ${frame.tower.upperFt} ft: spray can be carried off-target.`, SOURCES.heuristic));
      } else if (d.dirShearDeg >= T.dirShear.cautionDeg) {
        rs.push(reason("dirShear", "CAUTION", `Wind direction differs by ${Math.round(d.dirShearDeg)}° between ${frame.tower.lowerFt} ft and ${frame.tower.upperFt} ft.`, SOURCES.track));
      }
    }
  }

  // Delta T: the class-independent ends here; the 10-12 band is handled per class below.
  const dt = d.deltaTC;
  const band = deltaTBand(dt);
  if (band === "low") {
    rs.push(reason("deltaT", "CAUTION", `Delta T is ${r1(dt)}°C (under ${T.deltaT.cautionBelowC}°C): humid air, droplets stay airborne longer.`, SOURCES.grdc2025));
  } else if (band === "over") {
    rs.push(reason("deltaT", "STOP", `Delta T is ${r1(dt)}°C (${T.deltaT.stopAboveC}°C or more): droplets evaporate before they land.`, SOURCES.grdc2025));
  }

  // Volatility
  if (full && product.volatility === "high" && hasInversion) {
    rs.push(reason("volatility", "STOP", `${product.name} is highly volatile (${r1(product.vaporPressureMpa)} mPa, over ${T.volatility.highAboveMpa} mPa) and there is a ${r1(inv)}°F inversion: vapor will stay near the ground and move.`, SOURCES.ppdb));
  }
  if (full && product.volatility === "high" && frame.context?.inversionForecastNext12h) {
    rs.push(reason("volatilityForecast", "CAUTION", `An inversion is forecast within ${T.volatility.vaporWatchHours} hours: vapor can keep moving for hours after application.`, SOURCES.epaVolatility));
  }

  // Timing hint
  if (w.cloudPct <= T.timingHint.maxCloudPct && inInversionWindow(Date.parse(frame.time))) {
    rs.push(reason("timingHint", "CAUTION", `Clear sky (${Math.round(w.cloudPct)}% cloud) between ${T.timingHint.hoursBeforeSunset} hours before sunset and ${T.timingHint.hoursAfterSunrise} hour after sunrise: an inversion is likely forming or present.`, SOURCES.faber2015));
  }

  // Rain
  if (w.rainInHr > T.rain.stopAboveInHr) {
    rs.push(reason("rain", "STOP", `Rain is falling at ${r2(w.rainInHr)} in/hr (over ${T.rain.stopAboveInHr} in/hr): spray would wash off.`, SOURCES.amsRain));
  } else if (w.rainInHr > 0) {
    rs.push(reason("rain", "CAUTION", `Light rain is falling at ${r2(w.rainInHr)} in/hr.`, SOURCES.amsRain));
  }
  if (w.rainProbNext2hPct > T.rain.probCautionPct) {
    rs.push(reason("rainChance", "CAUTION", `${Math.round(w.rainProbNext2hPct)}% chance of rain in the next 2 hours: check the label's rainfast period.`, SOURCES.heuristic));
  }

  // Storm approaching
  if (w.pressureTrendHpaPerHr <= T.pressure.fallingRapidlyHpaPerHr) {
    rs.push(reason("pressure", "CAUTION", `Storm approaching: pressure is falling ${r1(-w.pressureTrendHpaPerHr)} hPa per hour.`, SOURCES.presfr));
  }

  // Base status (class-independent)
  let base: Status = "GO";
  for (const x of rs) base = worse(base, x.status);

  // Droplet loop: only label minimum and the Delta T 10-12 rule depend on class.
  const startIdx = dropletIndex(product.labelMinDroplet);
  const perClass: Partial<Record<DropletClass, Status>> = {};
  let bestGo: DropletClass | null = null;
  let bestCaution: DropletClass | null = null;
  for (let i = startIdx; i < DROPLET_ORDER.length; i++) {
    let st = base;
    if (band === "high") st = worse(st, i >= VC_INDEX ? "CAUTION" : "STOP");
    const c = DROPLET_ORDER[i];
    perClass[c] = st;
    if (st === "GO" && !bestGo) bestGo = c;
    if (st === "CAUTION" && !bestCaution) bestCaution = c;
  }
  const rec = bestGo ?? bestCaution;

  if (band === "high") {
    rs.push(reason("deltaT", "CAUTION", `Delta T is ${r1(dt)}°C (${T.deltaT.cautionFromC} to ${T.deltaT.stopAboveC}°C): fast evaporation, ${dropletInfo("VC").name} or larger droplets only.`, SOURCES.grdc2025));
  }

  rs.sort((a, b) => RANK[b.status] - RANK[a.status]);

  if (!rec) {
    const cause = rs.find((x) => x.status === "STOP");
    return {
      status: "STOP",
      reasons: rs,
      recommendedDroplet: null,
      dropletNote: `No droplet size makes this safe${cause ? `: ${cause.text}` : "."}`,
      perClass,
      mode,
    };
  }
  const info = dropletInfo(rec);
  const status = perClass[rec] as Status;
  if (rs.length === 0) {
    rs.push(reason("allClear", "GO", "Wind, temperature layers, Delta T, rain and pressure are all within limits.", SOURCES.heuristic));
  }
  return {
    status,
    reasons: rs,
    recommendedDroplet: rec,
    dropletNote: `Use ${info.name} or larger (${info.howToGet})`,
    perClass,
    mode,
  };
}
