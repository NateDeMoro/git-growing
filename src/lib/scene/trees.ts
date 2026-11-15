// Tree grid inside a polygon along its row bearing. Use when: building the instanced tree layer once per site.
import { bounds, pointInPolygon, type Origin, polygonLocal, fromLocal } from "./geometry";

export const TREE_CAP = 30000;
export const ROW_SPACING_M = 7; // between rows
export const TREE_SPACING_M = 6; // along a row

/** Returns [lon, lat] pairs flattened (Float64Array). Rows run along rowBearingDeg. Never exceeds cap. */
export function treeGrid(
  polygon: [number, number][],
  rowBearingDeg: number,
  origin: Origin,
  cap = TREE_CAP,
): Float64Array {
  const poly = polygonLocal(polygon, origin);
  const b = bounds(poly);
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  const th = (rowBearingDeg * Math.PI) / 180;
  // row direction (along) as unit vector from north bearing; cross direction is perpendicular
  const ax = Math.sin(th), ay = Math.cos(th);
  const px = ay, py = -ax;
  // extent in rotated frame
  let amin = Infinity, amax = -Infinity, pmin = Infinity, pmax = -Infinity;
  for (const [x, y] of poly) {
    const a = (x - cx) * ax + (y - cy) * ay;
    const p = (x - cx) * px + (y - cy) * py;
    amin = Math.min(amin, a); amax = Math.max(amax, a);
    pmin = Math.min(pmin, p); pmax = Math.max(pmax, p);
  }
  const est = ((amax - amin) * (pmax - pmin)) / (ROW_SPACING_M * TREE_SPACING_M);
  const k = est > cap ? Math.sqrt(est / cap) * 1.02 : 1;
  const ds = TREE_SPACING_M * k, dr = ROW_SPACING_M * k;
  const out: number[] = [];
  for (let p = pmin + dr / 2; p <= pmax && out.length / 2 < cap; p += dr) {
    for (let a = amin + ds / 2; a <= amax; a += ds) {
      const x = cx + a * ax + p * px;
      const y = cy + a * ay + p * py;
      if (!pointInPolygon(x, y, poly)) continue;
      const [lo, la] = fromLocal(x, y, origin);
      out.push(lo, la);
      if (out.length / 2 >= cap) break;
    }
  }
  return Float64Array.from(out);
}

/** Trees for several blocks; total stays at or under cap (blocks share the cap in order). */
export function treesForBlocks(
  blocks: { polygon: [number, number][]; rowBearingDeg: number }[],
  origin: Origin,
  cap = TREE_CAP,
): Float64Array {
  const parts: Float64Array[] = [];
  let total = 0;
  for (const bl of blocks) {
    const g = treeGrid(bl.polygon, bl.rowBearingDeg, origin, cap - total);
    parts.push(g);
    total += g.length / 2;
    if (total >= cap) break;
  }
  const all = new Float64Array(total * 2);
  let o = 0;
  for (const p of parts) { all.set(p, o); o += p.length; }
  return all;
}
