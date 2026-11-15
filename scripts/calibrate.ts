// Fits k (stratification scale) so the median nightly max (30 ft minus 5 ft) is 2.5 C. Writes data/calibration.json.
// Use when: site.ts changes or the calibration range changes. Run: npm run calibrate
import fs from "node:fs";
import path from "node:path";
import SunCalc from "suncalc";
import { SITE } from "../src/lib/site";
import { fitExponent, localToMs, logFraction } from "../src/lib/derive";
import { pullHourly } from "./lib-openmeteo";

const ROOT = path.resolve(__dirname, "..");
const START = "2024-01-01";
const END = "2026-11-01";
const TARGET_C = 2.5;
const BATTANY_BAND_C: [number, number] = [2, 3];
const K_RANGE: [number, number] = [0.3, 3];
const F30 = logFraction(30 * 0.3048, 2, 80); // fraction of the 2 m -> 80 m departure seen at 30 ft

const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
const r3 = (x: number) => Math.round(x * 1000) / 1000;

async function main() {
  const { lat, lon } = SITE.tower;
  const cacheDir = path.join(ROOT, "data", "raw");
  const years: [string, string][] = [["2024-01-01", "2024-12-31"], ["2025-01-01", "2025-12-31"], ["2026-01-01", END]];
  const recs = (await Promise.all(years.map(([s, e]) => pullHourly(lat, lon, s, e, cacheDir)))).flat();
  if (recs.length < 1000) throw new Error(`too few hours: ${recs.length}`);

  // exponents
  const exps = recs.filter((r) => r.ws10Kmh >= 2 && r.ws80Kmh >= 2).map((r) => fitExponent(r.ws10Kmh, r.ws80Kmh, 0.2));
  const medianExponent = median(exps);

  // nights: sunset(d) .. sunrise(d+1)+1h
  const byMs = recs.map((r) => ({ ms: localToMs(r.time), raw: r.t80mC - r.t2mC }));
  const nights: number[][] = []; // raw gradients per night
  const dayMs = 86400000;
  const firstDay = Math.floor(localToMs(START + "T12:00") / dayMs);
  const lastDay = Math.floor(localToMs(END + "T12:00") / dayMs) - 1;
  let idx = 0;
  for (let d = firstDay; d <= lastDay; d++) {
    const noon = (day: number) => new Date(day * dayMs + 12 * 3600000 + 7 * 3600000 - 12 * 3600000 + 12 * 3600000);
    const set = SunCalc.getTimes(noon(d), lat, lon).sunset.getTime();
    const rise = SunCalc.getTimes(noon(d + 1), lat, lon).sunrise.getTime() + 3600000;
    while (idx < byMs.length && byMs[idx].ms < set - 3600000) idx++;
    const g: number[] = [];
    for (let j = idx; j < byMs.length && byMs[j].ms <= rise; j++) if (byMs[j].ms >= set) g.push(byMs[j].raw);
    if (g.length >= 8) nights.push(g);
  }
  const posNights = nights.filter((g) => Math.max(...g) > 0);
  const maxRaw = posNights.map((g) => Math.max(...g));
  const kFor = (targetC: number) => targetC / (median(maxRaw) * F30); // inversion is linear in k, so the bisection target has this closed form
  let k = kFor(TARGET_C);
  let fallback = false;
  let fitPath = "yuma-2.5C";
  if (!(k >= K_RANGE[0] && k <= K_RANGE[1])) {
    fallback = true;
    fitPath = "battany-band-clamped";
    const mid = (BATTANY_BAND_C[0] + BATTANY_BAND_C[1]) / 2;
    k = Math.min(K_RANGE[1], Math.max(K_RANGE[0], kFor(mid)));
  }
  const nightHours = posNights.flat().length;
  const inverted = posNights.flat().filter((x) => x * k * F30 > 0).length;
  const out = {
    k: r3(k),
    medianExponent: r3(medianExponent),
    nightInvertedShare: r3(inverted / nightHours),
    medianNightMaxInversionC: r3(median(maxRaw.map((m) => m * k * F30))),
    nightsUsed: posNights.length,
    targetC: TARGET_C,
    fallback,
    fitPath,
    range: { start: START, end: END },
    site: { lat, lon },
  };
  fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "data", "calibration.json"), JSON.stringify(out, null, 2) + "\n");
  console.log(out);
}
main().catch((e) => { console.error(e); process.exit(1); });
