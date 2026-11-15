// Builds every deck layer for one tick, bottom to top. Use when: SceneMap pushes new layers into the overlay.
import { ColumnLayer, PathLayer, PolygonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { COORDINATE_SYSTEM } from "@deck.gl/core";
import { SITE } from "@/lib/site";
import { sceneElevationM, polygonLocal, polygonAreaAcres, bounds } from "@/lib/scene/geometry";
import { windVelocity } from "@/lib/scene/wind";
import { STATUS_RGB, tempColor, compass } from "@/lib/scene/color";
import type { PathBuf } from "../sim";
import type { SceneCtx } from "./types";

const TREE_DATA = new WeakMap<Float32Array, { length: number; attributes: { getPosition: { value: Float32Array; size: number } } }>();
const CHARS = Array.from(" 0123456789.,:-°ftmphNSEWdrift pathFLDC");
const BLOCKS = (() => {
  const o = { lon: SITE.tower.lon, lat: SITE.tower.lat };
  return SITE.blocks.map((b) => {
    const polygon = polygonLocal(b.polygon, o);
    return { id: b.id, name: b.name, polygon, acres: b.acres ?? polygonAreaAcres(polygon) };
  });
})();
const FARM = polygonLocal(SITE.farmOutline, { lon: SITE.tower.lon, lat: SITE.tower.lat });
const FB = bounds(FARM);
const rect = (pad: number, z: number): [number, number, number][] => [
  [FB.minX - pad, FB.minY - pad, z], [FB.maxX + pad, FB.minY - pad, z], [FB.maxX + pad, FB.maxY + pad, z], [FB.minX - pad, FB.maxY + pad, z],
];
const closed = (p: [number, number][]) => [...p, p[0]];

function binPath(b: PathBuf, n: number, pts: number) {
  return {
    length: n,
    startIndices: b.startIndices.subarray(0, n),
    attributes: {
      getPath: { value: b.path.subarray(0, n * pts * 3), size: 3 },
      getColor: { value: b.color.subarray(0, n * pts * 4), size: 4 },
    },
  };
}

export function buildLayers(c: SceneCtx) {
  const cs = { coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS, coordinateOrigin: [c.origin[0], c.origin[1], 0] as [number, number, number] };
  const status = c.assessment.status;
  const sc = STATUS_RGB[status];
  const noDepth = { depthWriteEnabled: false } as const;
  const k = c.flat ? 0 : 1;
  const out = [];

  // 1. farm outline + block outlines + focus
  out.push(
    new PathLayer({ id: "farm", ...cs, data: [closed(FARM)], getPath: (d: [number, number][]) => d, getColor: [230, 235, 245, 200], getWidth: 2, widthUnits: "pixels" }),
    new PolygonLayer({
      id: "blocks", ...cs, data: BLOCKS, pickable: true, getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
      getFillColor: (d: { id: string }) => (d.id === c.focusId ? [...sc, 38] : [255, 255, 255, 6]),
      getLineColor: (d: { id: string }) => (d.id === c.focusId ? [...sc, 255] : [255, 255, 255, 90]),
      getLineWidth: (d: { id: string }) => (d.id === c.focusId ? 4 : 1), lineWidthUnits: "pixels",
      stroked: true, filled: true, onClick: (i: { object?: { id: string } }) => i.object && c.onFocus(i.object.id),
      updateTriggers: { getFillColor: [c.focusId, status], getLineColor: [c.focusId, status], getLineWidth: [c.focusId] },
    }),
  );

  // 9. neighbors
  const flash = c.flashed;
  const bld = c.neighbors.filter((n) => n.polygon);
  out.push(
    new PolygonLayer({
      id: "nbr-buildings", ...cs, data: bld, getPolygon: (d: { polygon?: [number, number][] }) => d.polygon!, extruded: !c.flat,
      getElevation: (d: { kind: string }) => (d.kind === "school" ? 60 : 36), getFillColor: (d: { id: number; kind: string }) => flash.has(d.id) ? [239, 68, 68, 235] : d.kind === "school" ? [250, 204, 21, 230] : [70, 74, 84, 235],
      material: false, updateTriggers: { getFillColor: [Array.from(flash).join(",")], getElevation: [c.flat] },
    }),
    new PathLayer({ id: "nbr-roads", ...cs, data: c.neighbors.filter((n) => n.line), getPath: (d: { line?: [number, number][] }) => d.line!, getColor: [160, 165, 175, 140], getWidth: 2, widthUnits: "pixels" }),
    new TextLayer({
      id: "nbr-flash", ...cs, data: c.neighbors.filter((n) => flash.has(n.id)), getPosition: (d: { centroid?: [number, number] }) => [...d.centroid!, 90] as [number, number, number],
      getText: () => "drift path", getSize: 14, getColor: [255, 120, 120, 255], background: true, getBackgroundColor: [40, 0, 0, 200], fontFamily: "sans-serif", characterSet: CHARS, updateTriggers: { data: [Array.from(flash).join(",")] },
    }),
  );

  // 2. trees (one instanced layer, static data; data reference cached so positions upload once)
  let treeData = TREE_DATA.get(c.trees);
  if (!treeData) { treeData = { length: c.trees.length / 2, attributes: { getPosition: { value: c.trees, size: 2 } } }; TREE_DATA.set(c.trees, treeData); }
  out.push(
    new ColumnLayer({
      id: "trees", ...cs, data: treeData as never,
      diskResolution: 6, radius: 1.8, extruded: true, getElevation: c.flat ? 4 : sceneElevationM(14.76), getFillColor: [22, 78, 40, 255], material: { ambient: 0.6, diffuse: 0.6, shininess: 8, specularColor: [30, 30, 30] },
      updateTriggers: { getElevation: [c.flat] },
    }),
  );

  // 4. slabs
  const polys = c.layers.map((l, i) => {
    const col = tempColor(l.tempF, c.tMin, c.tMax);
    const bold = l.heightFt === 5 || l.heightFt === 30;
    return { poly: rect(150, sceneElevationM(l.heightFt)), color: [...col, bold ? 46 : 14], i };
  });
  out.push(
    new PolygonLayer({ id: "slabs", ...cs, data: polys, getPolygon: (d: { poly: [number, number, number][] }) => d.poly, getFillColor: (d: { color: number[] }) => d.color as never, stroked: false, parameters: noDepth, updateTriggers: { getFillColor: [c.ver, c.tMin, c.tMax], getPolygon: [c.ver] } }),
  );

  // 5. inversion lid
  if (c.lidFt !== null) {
    const pulse = status === "STOP" ? 0.5 + 0.5 * Math.sin(c.tSec * 3) : 0.5;
    const z = sceneElevationM(c.lidFt) + 3;
    out.push(new PolygonLayer({
      id: "lid", ...cs, data: [{ poly: rect(150, z) }], getPolygon: (d: { poly: [number, number, number][] }) => d.poly, filled: true, stroked: true, getLineWidth: 3 + 3 * pulse, lineWidthUnits: "pixels",
      getFillColor: [255, 190, 70, Math.round(26 + 40 * pulse)], getLineColor: [255, 176, 32, Math.round(170 + 85 * pulse)], parameters: noDepth,
      updateTriggers: { getFillColor: [pulse, c.lidFt], getLineColor: [pulse], getLineWidth: [pulse], getPolygon: [c.lidFt] },
    }));
  }

  // 3. tower, nodes, labels
  const tw = c.layers.filter((l) => l.heightFt === 5 || l.heightFt === 30);
  out.push(
    new ColumnLayer({ id: "tower", ...cs, data: [{}], getPosition: () => [0, 0], diskResolution: 8, radius: 1.5, extruded: true, getElevation: sceneElevationM(30), getFillColor: [210, 215, 225, 255], offset: [0, 0] }),
    new ScatterplotLayer({ id: "nodes", ...cs, data: tw, getPosition: (l: { heightFt: number }) => [0, 0, sceneElevationM(l.heightFt)], radiusUnits: "pixels", getRadius: 9, getFillColor: (l: { tempF: number }) => [...tempColor(l.tempF, c.tMin, c.tMax), 255] as never, stroked: true, getLineColor: [255, 255, 255, 255], lineWidthUnits: "pixels", getLineWidth: 2, updateTriggers: { getFillColor: [c.ver, c.tMin, c.tMax] } }),
    new TextLayer({
      id: "tower-labels", ...cs, data: tw, getPosition: (l: { heightFt: number }) => [6, 0, sceneElevationM(l.heightFt)], getText: (l: { heightFt: number; tempF: number; windMph: number; windDirDeg: number }) => `${l.heightFt} ft: ${l.tempF.toFixed(1)}°F, ${l.windMph.toFixed(1)} mph ${compass(l.windDirDeg)}`,
      getSize: 13, getColor: [255, 255, 255, 255], getTextAnchor: "start", getAlignmentBaseline: "center", background: true, getBackgroundColor: [8, 12, 24, 200], backgroundPadding: [4, 2], fontFamily: "sans-serif", characterSet: CHARS, billboard: true,
      updateTriggers: { getText: [c.ver] },
    }),
  );

  // 6. wind arrows at the tower
  const arrows = c.layers.map((l) => {
    const v = windVelocity(l.windMph, l.windDirDeg);
    const len = 12 + l.windMph * 5, sp = Math.hypot(v.east, v.north) || 1;
    const ux = v.east / sp, uy = v.north / sp, z = sceneElevationM(l.heightFt);
    const tip = [ux * len, uy * len, z], hl = len * 0.3;
    const h1 = [tip[0] - (ux * 0.9 - uy * 0.45) * hl, tip[1] - (uy * 0.9 + ux * 0.45) * hl, z];
    const h2 = [tip[0] - (ux * 0.9 + uy * 0.45) * hl, tip[1] - (uy * 0.9 - ux * 0.45) * hl, z];
    return { path: [[0, 0, z], tip, h1, tip, h2], bold: l.heightFt === 5 || l.heightFt === 30 };
  });
  out.push(new PathLayer({ id: "arrows", ...cs, data: arrows, getPath: (d: { path: number[][] }) => d.path as never, getColor: (d: { bold: boolean }) => (d.bold ? [255, 255, 255, 255] : [200, 210, 230, 90]), getWidth: (d: { bold: boolean }) => (d.bold ? 5 : 2), widthUnits: "pixels", updateTriggers: { getPath: [c.ver], getColor: [c.ver] } }));

  // 7/8/11 particles
  const pl = (id: string, b: PathBuf, n: number, pts: number, w: number) =>
    new PathLayer({ id, ...cs, data: binPath(b, n, pts) as never, getWidth: w, widthUnits: "pixels", _pathType: "open", parameters: noDepth, capRounded: false } as never);
  out.push(pl("wind", c.wind, c.windN, 5, 2));
  if (c.spraying && c.driftN) out.push(pl("drift", c.drift, c.driftN, 5, 3));
  if (c.rainN) out.push(pl("rain", c.rain, c.rainN, 2, 1.2));

  // 11. cloud deck
  if (c.frame.weather.cloudPct > 30) {
    out.push(new PolygonLayer({ id: "cloud", ...cs, data: [{ poly: rect(700, 900) }], getPolygon: (d: { poly: number[][] }) => d.poly as never, stroked: false, getFillColor: [40, 46, 58, Math.round(Math.min(1, (c.frame.weather.cloudPct - 30) / 70) * 140 * (0.4 + 0.6 * c.stormLevel))], parameters: noDepth, updateTriggers: { getFillColor: [c.frame.weather.cloudPct, c.stormLevel] } }));
  }
  void k;
  return out;
}

export { BLOCKS, FARM, FB };
