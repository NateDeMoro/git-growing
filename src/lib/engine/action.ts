// "Do this" line: one plain sentence telling the applicator what to do now. Pure.
// Use when: the verdict bar needs an instruction built from the assessment, next safe window and early warning.
import type { Assessment, ForecastResult, Product, SceneFrame } from "../contract";
import { dropletInfo } from "../droplets";

export interface ActionInput {
  assessment: Assessment;
  frame?: SceneFrame; // supplies the numbers for the short cause
  product: Pick<Product, "labelWindMaxMph">;
  nextSafeStart?: string | null; // ISO start of the next GO window (2 h or more), if known
  earlyWarning?: ForecastResult["earlyWarning"];
}

/** "Mon 9:30 AM" from an ISO string with local offset (no timezone conversion). */
export function windowLabel(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  const day = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const h = Number(iso.slice(11, 13));
  const m = iso.slice(14, 16);
  return `${day} ${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

/** Short cause per rule, with real numbers. Falls back to the reason text. */
export function shortCause(ruleId: string, text: string, frame?: SceneFrame, product?: Pick<Product, "labelWindMaxMph">): string {
  const fb = text.replace(/\.$/, "");
  if (!frame) return fb;
  const d = frame.derived, w = frame.weather;
  const wind = frame.layers.find((l) => l.heightFt === 5)?.windMph ?? 0;
  const lim = product?.labelWindMaxMph;
  switch (ruleId) {
    case "inversion": return `inversion (30 ft is ${d.inversionF.toFixed(1)}°F warmer)`;
    case "windHigh": return lim != null ? `wind ${wind.toFixed(0)} mph, over the ${lim} mph limit` : `wind ${wind.toFixed(0)} mph`;
    case "windLow": return `too calm (${wind.toFixed(1)} mph)`;
    case "gust": return `gusts to ${w.gustMph.toFixed(0)} mph`;
    case "dirShear": return `wind direction splits ${d.dirShearDeg.toFixed(0)}° between heights`;
    case "speedShear": return `wind speed differs ${d.speedShearMph.toFixed(0)} mph between heights`;
    case "rain": return `rain ${w.rainInHr.toFixed(2)} in/hr`;
    case "rainChance": return `${w.rainProbNext2hPct.toFixed(0)}% chance of rain soon`;
    case "deltaT": return `Delta T ${d.deltaTC.toFixed(0)}°C`;
    case "volatility": case "volatilityForecast": return "volatile product + inversion";
    case "timingHint": return "inversion likely forming";
    case "pressure": return "storm approaching";
    default: return fb;
  }
}

/** Use when: you need the "Do this" sentence. */
export function actionLine({ assessment: a, frame, product, nextSafeStart, earlyWarning }: ActionInput): string {
  const r0 = a.reasons[0];
  const top = r0 ? shortCause(r0.ruleId, r0.text, frame, product) : "";
  const rec = a.recommendedDroplet;
  if (a.status === "GO") {
    const droplet = rec ? `${dropletInfo(rec).name} (${rec}) or larger droplets` : "the label droplet size";
    const warn = earlyWarning ? ` Conditions turn ${earlyWarning.status} in about ${earlyWarning.hours ?? 1} hour${(earlyWarning.hours ?? 1) > 1 ? "s" : ""}, so finish early.` : "";
    return `Spray now with ${droplet}, and stop if the wind passes ${product.labelWindMaxMph} mph.${warn}`;
  }
  if (a.status === "CAUTION") {
    return rec
      ? `Hold, or switch to ${dropletInfo(rec).name} (${rec}) or coarser droplets before spraying.`
      : "Hold off and recheck in an hour.";
  }
  const when = nextSafeStart ? ` Next safe window starts ${windowLabel(nextSafeStart)}.` : " No safe window is known yet.";
  return `Don't spray: ${top}.${when}`;
}
