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

export type CautionKind = "care" | "wait";
export type ActionKind = CautionKind | null;

const WAIT_RULES = new Set(["gust", "windLow", "inversion", "rain"]);

/** Use when: CAUTION needs a kind ("care" or "wait") and one plain sentence. Any wait reason wins over care reasons. */
export function cautionAction({ assessment: a, frame, product, nextSafeStart, earlyWarning }: ActionInput): { kind: ActionKind; line: string } {
  const rs = a.reasons.filter((r) => r.status === "CAUTION");
  if (a.status !== "CAUTION" || rs.length === 0) return { kind: null, line: "" };
  if (rs.some((r) => WAIT_RULES.has(r.ruleId))) {
    return { kind: "wait", line: nextSafeStart ? `Wait until ${windowLabel(nextSafeStart)}.` : "Wait and recheck in an hour." };
  }
  const rec = a.recommendedDroplet;
  const conds: string[] = [];
  const add = (c: string) => { if (!conds.includes(c)) conds.push(c); };
  for (const r of rs) {
    switch (r.ruleId) {
      case "deltaT": add(frame && frame.derived.deltaTC < 5 ? "you use Coarse (C) or coarser nozzles, since humid air keeps droplets airborne" : "you use only Very Coarse (VC) or coarser nozzles"); break;
      case "windHigh": add(`you watch the wind and stop if it reaches ${product.labelWindMaxMph} mph`); break;
      case "timingHint": add("you finish the block you're on and don't start a new one"); break;
      case "rainChance": add("the label's rainfast time is shorter than the time until rain"); break;
      case "pressure": {
        const h = earlyWarning?.hours;
        add(h ? `you finish within ${h} hour${h > 1 ? "s" : ""}, before the storm` : "you finish soon, before the storm");
        break;
      }
      case "volatilityForecast": add("you finish well before tonight's inversion"); break;
      case "speedShear": case "dirShear": add("you use coarser droplets and watch the wind at 30 ft"); break;
      default: add("you watch conditions closely");
    }
  }
  let line = `OK to spray if: ${conds.slice(0, 2).join("; ")}.`;
  if (rec && !conds.some((c) => /nozzle|droplet/.test(c))) line += ` Use ${dropletInfo(rec).name} (${rec}) or coarser droplets.`;
  return { kind: "care", line };
}

/** Use when: you need the "Do this" sentence. */
export function actionLine(input: ActionInput): string {
  const { assessment: a, frame, product, nextSafeStart, earlyWarning } = input;
  const r0 = a.reasons[0];
  const top = r0 ? shortCause(r0.ruleId, r0.text, frame, product) : "";
  const rec = a.recommendedDroplet;
  if (a.status === "GO") {
    const droplet = rec ? `${dropletInfo(rec).name} (${rec}) or larger droplets` : "the label droplet size";
    const warn = earlyWarning ? ` Conditions turn ${earlyWarning.status} in about ${earlyWarning.hours ?? 1} hour${(earlyWarning.hours ?? 1) > 1 ? "s" : ""}, so finish early.` : "";
    return `Spray now with ${droplet}, and stop if the wind passes ${product.labelWindMaxMph} mph.${warn}`;
  }
  if (a.status === "CAUTION") return cautionAction(input).line;
  const when = nextSafeStart ? ` Next safe window starts ${windowLabel(nextSafeStart)}.` : " No safe window is known yet.";
  return `Don't spray: ${top}.${when}`;
}
