// Downloads Esri World Imagery tiles to public/tiles/{z}/{x}/{y}.jpg (z13-17). Use when: site pin changes or tiles are missing.
// Coverage: 3 km around the tower at z13-16, z17 only over the farm outline (keeps count under ~400). Skips existing files.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { SITE } from "../src/lib/site";

const CAP = 400;
const { lat, lon } = SITE.tower;
const dLat = 3000 / 111320, dLon = 3000 / (111320 * Math.cos((lat * Math.PI) / 180));
const farm = SITE.farmOutline;
const fb = {
  w: Math.min(...farm.map((p) => p[0])), e: Math.max(...farm.map((p) => p[0])),
  s: Math.min(...farm.map((p) => p[1])), n: Math.max(...farm.map((p) => p[1])),
};
const around = { w: lon - dLon, e: lon + dLon, s: lat - dLat, n: lat + dLat };
const union = { w: Math.min(fb.w, around.w), e: Math.max(fb.e, around.e), s: Math.min(fb.s, around.s), n: Math.max(fb.n, around.n) };

const tx = (lo: number, z: number) => Math.floor(((lo + 180) / 360) * 2 ** z);
const ty = (la: number, z: number) => {
  const r = (la * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

const tiles: [number, number, number][] = [];
for (let z = 13; z <= 17; z++) {
  const b = z === 17 ? fb : union;
  for (let x = tx(b.w, z); x <= tx(b.e, z); x++)
    for (let y = ty(b.n, z); y <= ty(b.s, z); y++) tiles.push([z, x, y]);
}
console.log(`${tiles.length} tiles`);
if (tiles.length > CAP) console.warn(`over cap of ${CAP}`);

async function get([z, x, y]: [number, number, number]) {
  const path = `public/tiles/${z}/${x}/${y}.jpg`;
  if (existsSync(path)) return "skip";
  const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return "ok";
}

async function main() {
  let done = 0, fail = 0;
  for (let i = 0; i < tiles.length; i += 4) {
    const r = await Promise.allSettled(tiles.slice(i, i + 4).map(get));
    r.forEach((x) => (x.status === "fulfilled" ? done++ : (fail++, console.error(String(x.reason)))));
  }
  mkdirSync("public/tiles", { recursive: true });
  writeFileSync(
    "public/tiles/ATTRIBUTION.txt",
    "Imagery: Esri, Maxar, Earthstar Geographics, and the GIS User Community. Source: Esri World Imagery.\n",
  );
  console.log(`done ${done}, failed ${fail}`);
}
main();
