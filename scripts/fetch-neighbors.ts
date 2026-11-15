// Fetches buildings, schools and roads within 3 km of the tower from Overpass into data/neighbors.geojson.
// Use when: refreshing neighbors. Falls back to a hand-placed illustrative set if both servers fail.
// Run: npx tsx scripts/fetch-neighbors.ts
import fs from "node:fs";
import { SITE } from "../src/lib/site";
import { fromLocal } from "../src/lib/scene/geometry";

const SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const { lat, lon } = SITE.tower;
const Q = `[out:json][timeout:25];(way["building"](around:3000,${lat},${lon});way["highway"~"^(primary|secondary|tertiary|residential|unclassified|service)$"](around:3000,${lat},${lon});nwr["amenity"="school"](around:3000,${lat},${lon}););out geom;`;

type Feature = { type: "Feature"; properties: Record<string, unknown>; geometry: unknown };

async function viaOverpass(): Promise<Feature[] | null> {
  for (const s of SERVERS) {
    try {
      const r = await fetch(s, { method: "POST", body: "data=" + encodeURIComponent(Q), signal: AbortSignal.timeout(30000) });
      if (!r.ok) continue;
      const j = (await r.json()) as { elements: { type: string; tags?: Record<string, string>; geometry?: { lat: number; lon: number }[] }[] };
      const out: Feature[] = [];
      for (const e of j.elements) {
        if (!e.geometry || e.geometry.length < 2) continue;
        const pts = e.geometry.map((g) => [g.lon, g.lat]);
        const tags = e.tags ?? {};
        if (tags.highway) out.push({ type: "Feature", properties: { kind: "road", name: tags.name ?? "" }, geometry: { type: "LineString", coordinates: pts } });
        else if (pts.length >= 4) {
          const school = tags.amenity === "school";
          out.push({ type: "Feature", properties: { kind: school ? "school" : "building", name: tags.name ?? "" }, geometry: { type: "Polygon", coordinates: [pts] } });
        }
      }
      if (out.length) return out;
    } catch (e) {
      console.warn("overpass failed", s, String(e));
    }
  }
  return null;
}

function box(cx: number, cy: number, w: number, h: number, kind: string, name = ""): Feature {
  const o = { lon, lat };
  const c = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2]].map(([x, y]) => fromLocal(cx + x, cy + y, o));
  return { type: "Feature", properties: { kind, name, illustrative: true }, geometry: { type: "Polygon", coordinates: [c] } };
}

function fallback(): Feature[] {
  const o = { lon, lat };
  const road = (pts: [number, number][], name: string): Feature => ({
    type: "Feature",
    properties: { kind: "road", name, illustrative: true },
    geometry: { type: "LineString", coordinates: pts.map(([x, y]) => fromLocal(x, y, o)) },
  });
  const f: Feature[] = [
    road([[-1800, 505], [1800, 505]], "County 15th St"),
    road([[-420, -1800], [-420, 1800]], "Road (west edge)"),
    road([[410, -1800], [410, 1800]], "Road (east edge)"),
  ];
  // house cluster downwind (south) of the farm
  [[-250, -800], [-200, -840], [-150, -800], [-250, -890], [-170, -900], [-100, -860], [-30, -820]].forEach(([x, y], i) =>
    f.push(box(x, y, 18, 14, "building", `House ${i + 1}`)),
  );
  f.push(box(520, 120, 60, 25, "school", "School (illustrative)"));
  f.push(box(520, 175, 20, 14, "building", "Annex"));
  return f;
}

async function main() {
  let features = await viaOverpass();
  const illustrative = !features;
  if (!features) features = fallback();
  const fc = { type: "FeatureCollection", illustrative, generatedAt: new Date().toISOString(), features };
  fs.mkdirSync("data", { recursive: true });
  fs.mkdirSync("public/data", { recursive: true });
  const s = JSON.stringify(fc);
  fs.writeFileSync("data/neighbors.geojson", s);
  fs.writeFileSync("public/data/neighbors.geojson", s); // served copy for the client
  console.log(illustrative ? "fallback (illustrative)" : "overpass", features.length);
}
main();
