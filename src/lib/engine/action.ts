// "Do this" line: one plain sentence telling the applicator what to do now. Pure.
// Use when: the verdict bar needs an instruction built from the assessment, next safe window and early warning.
import type { Assessment, ForecastResult, Product } from "../contract";
import { dropletInfo } from "../droplets";

export interface ActionInput {
  assessment: Assessment;
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

/** Use when: you need the "Do this" sentence. */
export function actionLine({ assessment: a, product, nextSafeStart, earlyWarning }: ActionInput): string {
  const top = a.reasons[0]?.text.replace(/\.$/, "") ?? "";
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
  const when = nextSafeStart ? `the next safe window starts ${windowLabel(nextSafeStart)}` : "no safe window is known yet";
  return `Don't spray: ${top.charAt(0).toLowerCase()}${top.slice(1)}; ${when}.`;
}
