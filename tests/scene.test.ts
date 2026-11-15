import { describe, expect, it } from "vitest";
import { MOCK_ASSESSMENT, MOCK_FRAME } from "@/lib/mockFrame";
import { SITE } from "@/lib/site";
import type { SceneFrame } from "@/lib/contract";
import { sceneElevationFt, polygonLocal, pointInPolygon } from "@/lib/scene/geometry";
import { windVelocity } from "@/lib/scene/wind";
import { lidHeightFt } from "@/lib/scene/lid";
import { driftBehavior } from "@/lib/scene/drift";
import { treeGrid, treesForBlocks, TREE_CAP } from "@/lib/scene/trees";
import { advectOne } from "@/lib/scene/advect";

const origin = { lon: SITE.tower.lon, lat: SITE.tower.lat };
const goFrame: SceneFrame = {
  ...MOCK_FRAME,
  layers: MOCK_FRAME.layers.map((l) => ({ ...l, tempF: 70 - l.heightFt * 0.01, windMph: 5 })),
  derived: { ...MOCK_FRAME.derived, inversionF: -0.5 },
  weather: { ...MOCK_FRAME.weather, rainInHr: 0, gustMph: 6 },
};

describe("scene helpers", () => {
  it("maps 30 ft to 300 ft of scene elevation", () => {
    expect(sceneElevationFt(30)).toBe(300);
  });

  it("wind from the north blows south; east wind blows west; west wind blows east", () => {
    const n = windVelocity(10, 0);
    expect(n.north).toBeLessThan(0);
    expect(Math.abs(n.east)).toBeLessThan(1e-9);
    expect(windVelocity(10, 90).east).toBeLessThan(0);
    expect(windVelocity(10, 270).east).toBeGreaterThan(0);
  });

  it("lid is the warmest layer at or below 100 ft, none when not inverted", () => {
    expect(lidHeightFt(MOCK_FRAME)).toBe(100);
    expect(lidHeightFt(goFrame)).toBeNull();
  });

  it("drift ceiling is below the lid under inversion and absent in GO", () => {
    const inv = driftBehavior(MOCK_FRAME, MOCK_ASSESSMENT);
    expect(inv.ceilingFt).not.toBeNull();
    expect(inv.ceilingFt!).toBeLessThan(lidHeightFt(MOCK_FRAME)!);
    expect(driftBehavior(goFrame, { ...MOCK_ASSESSMENT, status: "GO", reasons: [] }).ceilingFt).toBeNull();
  });

  it("every tree is inside its block and totals stay under the cap, even for a giant polygon", () => {
    for (const b of SITE.blocks) {
      const g = treeGrid(b.polygon, b.rowBearingDeg, origin);
      const poly = polygonLocal(b.polygon, origin);
      for (let i = 0; i < g.length; i += 2) {
        const [x, y] = [(g[i] - origin.lon) * 111320 * Math.cos((origin.lat * Math.PI) / 180), (g[i + 1] - origin.lat) * 110574];
        expect(pointInPolygon(x, y, poly)).toBe(true);
      }
    }
    expect(treesForBlocks(SITE.blocks, origin).length / 2).toBeLessThanOrEqual(TREE_CAP);
    const giant: [number, number][] = [[-115, 32], [-114, 32], [-114, 33], [-115, 33]];
    const g = treeGrid(giant, 30, origin);
    expect(g.length / 2).toBeLessThanOrEqual(TREE_CAP);
    expect(g.length).toBeGreaterThan(0);
  });

  it("one advection step moves by velocity times dt and wraps inside the box", () => {
    const box = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    const p = new Float32Array([10, 20, 5]);
    advectOne(p, 0, 3, 2, -1, 5, box);
    expect([p[0], p[1], p[2]]).toEqual([20, 15, 5]);
    const q = new Float32Array([95, 2, 0]);
    advectOne(q, 0, 3, 2, -1, 5, box);
    expect(q[0]).toBeCloseTo(5);
    expect(q[1]).toBeCloseTo(97);
  });
});
