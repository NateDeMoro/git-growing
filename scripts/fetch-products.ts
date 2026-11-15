// Builds data/products.json: PubChem vapor pressure (converted to mPa at ~25 C) + hand-entered label fields.
// Use when: changing the product list or re-verifying volatility bands. Run: npm run fetch:products
import { writeFileSync } from "node:fs";
import type { DropletClass, Product, VolatilityBand } from "../src/lib/contract";

interface Entry {
  id: string; name: string; cid?: number; labelMinDroplet: DropletClass;
  manualMpa?: number; note: string; high?: boolean;
}

const LABEL = "Label limits illustrative, check label.";
const ENTRIES: Entry[] = [
  { id: "abamectin", name: "Abamectin", cid: 9920327, labelMinDroplet: "M", note: `Citrus miticide. ${LABEL}` },
  { id: "imidacloprid", name: "Imidacloprid", cid: 86287518, labelMinDroplet: "M", note: `Systemic insecticide. ${LABEL}` },
  { id: "chlorpyrifos", name: "Chlorpyrifos", cid: 2730, labelMinDroplet: "M", note: `Organophosphate insecticide. ${LABEL}` },
  { id: "trifluralin", name: "Trifluralin", cid: 5569, labelMinDroplet: "M", note: `Orchard-floor herbicide. ${LABEL}` },
  { id: "narrow-range-oil", name: "Narrow-range oil", labelMinDroplet: "M", manualMpa: 0.1,
    note: `Petroleum oil, no usable PubChem value; vapor pressure hand-entered as approximate (negligible volatility). ${LABEL}` },
  { id: "copper-hydroxide", name: "Copper hydroxide", labelMinDroplet: "M", manualMpa: 0.000001,
    note: `Inorganic fungicide, effectively non-volatile; value hand-entered. ${LABEL}` },
  { id: "24d-ehe", name: "2,4-D 2-ethylhexyl ester", cid: 61286, labelMinDroplet: "C", high: true,
    note: `High-volatility example (ester herbicide near orchards). ${LABEL}` },
];

const toMpa: Record<string, number> = { mpa: 1, kpa: 1e6, pa: 1e3, mmhg: 133322 };
const NUM = "(\\d+(?:\\.\\d+)?(?:\\s*(?:[eE]|[xX]\\s*10\\^?)\\s*[-+]?\\d+)?)";
const RE = new RegExp(`${NUM}\\s*(?:\\[)?(mPa|kPa|Pa|mm\\s?Hg)`, "i");

function parseNum(s: string): number {
  const m = /^(\d+(?:\.\d+)?)(?:\s*(?:[eE]|[xX]\s*10\^?)\s*([-+]?\d+))?$/.exec(s.trim())!;
  return Number(m[1]) * (m[2] ? 10 ** Number(m[2]) : 1);
}

/** Best (value mPa, source string) from PubChem strings: prefer ~25 C, then untagged, then 20 C. */
export function pickMpa(strings: string[]): { mpa: number; from: string } | null {
  let best: { rank: number; mpa: number; from: string } | null = null;
  for (const s of strings) {
    for (const seg of s.split(";")) {
      const m = RE.exec(seg);
      if (!m) continue;
      const mpa = parseNum(m[1]) * toMpa[m[2].toLowerCase().replace(/\s/g, "")];
      const rank = /25\s*°?\s*C|77\s*°?\s*F/i.test(seg) ? 0 : /\d+\s*°\s*[CF]/.test(seg) ? 2 : 1;
      if (!best || rank < best.rank) best = { rank, mpa, from: seg.trim() };
    }
  }
  return best && { mpa: best.mpa, from: best.from };
}

function strings(o: unknown, out: string[] = []): string[] {
  if (Array.isArray(o)) o.forEach((v) => strings(v, out));
  else if (o && typeof o === "object") {
    const r = o as Record<string, unknown>;
    if (typeof r.String === "string") out.push(r.String);
    Object.values(r).forEach((v) => strings(v, out));
  }
  return out;
}

const band = (mpa: number): VolatilityBand => (mpa > 10 ? "high" : mpa >= 5 ? "moderate" : "low");

async function main() {
  const products: Product[] = [];
  for (const e of ENTRIES) {
    let mpa = e.manualMpa, from = "hand-entered";
    if (e.cid) {
      try {
        const res = await fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${e.cid}/JSON?heading=Vapor+Pressure`,
          { signal: AbortSignal.timeout(15000) },
        );
        const hit = pickMpa(strings(await res.json()));
        if (hit) { mpa = hit.mpa; from = hit.from; }
      } catch (err) { console.error(`PubChem failed for ${e.name}`, err); }
    }
    if (mpa === undefined) throw new Error(`No vapor pressure for ${e.name}; add manualMpa`);
    const p: Product = {
      id: e.id, name: e.name, pubchemCid: e.cid, vaporPressureMpa: mpa, volatility: band(mpa),
      labelWindMaxMph: 10, labelMinDroplet: e.labelMinDroplet, note: e.note,
      ...(e.high ? { isHighVolatilityExample: true } : {}),
    };
    products.push(p);
    console.log(`${e.name.padEnd(26)} ${mpa.toExponential(2).padStart(10)} mPa  ${p.volatility.padEnd(8)} <- ${from}`);
  }
  const hi = products.find((p) => p.isHighVolatilityExample)!;
  if (hi.vaporPressureMpa <= 10) throw new Error("High-volatility example is not over 10 mPa; pick another");
  writeFileSync("data/products.json", JSON.stringify(products, null, 2) + "\n");
}
main().catch((e) => { console.error(e); process.exit(1); });
