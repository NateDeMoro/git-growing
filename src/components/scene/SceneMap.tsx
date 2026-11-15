"use client";
// MapLibre map + deck.gl interleaved overlay. Use when: Scene3D needs the actual rendering (client only).
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map as MapGL, type MapRef } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import * as maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import type { Layer } from "@/lib/contract";
import { SITE } from "@/lib/site";
import { lidHeightFt } from "@/lib/scene/lid";
import { driftBehavior } from "@/lib/scene/drift";
import { easeLayers, EASE_MS } from "@/lib/scene/ease";
import { treeGrid } from "@/lib/scene/trees";
import { centroid, toLocal } from "@/lib/scene/geometry";
import type { Scene3DProps } from "./Scene3D";
import Overlay from "./Overlay";
import { fly, SW_ARIZONA, FARM_CENTER } from "./camera";
import { registerUiCallbacks, uiActions, useUiStore } from "@/lib/uiStore";
import { useAnimationLoop } from "./useAnimationLoop";
import { DriftSim, RainSim, WindSim, WIND_PER_LAYER } from "./sim";
import { buildLayers, BLOCKS, FB } from "./layers";
import type { Neighbor, SceneCtx } from "./layers/types";

// The bundled worker URL fails under Turbopack; serve a copy from /public (copied from node_modules/maplibre-gl/dist).
maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

const ORIGIN = { lon: SITE.tower.lon, lat: SITE.tower.lat };
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const LOCAL = "/tiles/{z}/{x}/{y}.jpg";

function makeOverlay() {
  return new MapboxOverlay({
    interleaved: true,
    layers: [],
    getTooltip: ({ object, layer }: { object?: { name?: string; acres?: number }; layer?: { id: string } | null }) =>
      layer?.id === "blocks" && object ? { text: `${object.name}, ${object.acres?.toFixed(1)} ac`, style: { background: "rgba(8,12,24,0.9)", color: "#fff", fontSize: "12px" } } : null,
  });
}

let TREES: { all: Float32Array; byBlock: Record<string, Float32Array> } | null = null;
function getTrees() {
  if (TREES) return TREES;
  const byBlock: Record<string, Float32Array> = {};
  const parts: Float32Array[] = [];
  let total = 0;
  for (const b of SITE.blocks) {
    const g = treeGrid(b.polygon, b.rowBearingDeg, ORIGIN, 30000 - total);
    const f = new Float32Array(g.length);
    for (let i = 0; i < g.length; i += 2) { const [x, y] = toLocal(g[i], g[i + 1], ORIGIN); f[i] = x; f[i + 1] = y; }
    byBlock[b.id] = f; parts.push(f); total += g.length / 2;
  }
  const all = new Float32Array(total * 2);
  let o = 0;
  for (const p of parts) { all.set(p, o); o += p.length; }
  TREES = { all, byBlock };
  return TREES;
}

function initState(layers: Layer[], focusId: string, props: Scene3DProps, spraying: boolean) {
  return {
    wind: new WindSim(layers.length),
    drift: new DriftSim(),
    rain: new RainSim(),
    shown: layers,
    from: layers,
    easeT0: -1e9,
    ver: 0,
    neighbors: [] as Neighbor[],
    flashed: new Set<number>(),
    flashTick: 0,
    zoomed: false,
    orbit: true,
    idleSince: 0,
    focus: focusId,
    flat: false,
    p: props,
    spraying,
    onFocus: (id: string) => {},
    clock: 0,
  };
}

export default function SceneMap(props: Scene3DProps) {
  const frame = props.frame;
  const { assessment } = props;
  const mapRef = useRef<MapRef>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [tileUrl, setTileUrl] = useState<string | null>(null);
  const [noTiles, setNoTiles] = useState(false);
  const [illustrative, setIllustrative] = useState(false);
  const [flat, setFlat] = useState(false);
  const [spray, setSpray] = useState<boolean | null>(null);
  const uiMode = useUiStore((u) => u.mode);
  const [focusLocal, setFocusLocal] = useState(SITE.defaultBlockId);
  const focusId = props.focusedBlockId ?? focusLocal;
  const spraying = props.spraying ?? spray ?? uiMode === "sim";

  // Intentional: mutable per-frame scene state shared with the render loop; refreshed each render (behavior unchanged).
  /* eslint-disable react-hooks/refs */
  const S = useRef<ReturnType<typeof initState> | null>(null);
  if (!S.current) S.current = initState(frame.layers, focusId, props, spraying);
  const s = S.current;
  s.p = props; s.spraying = spraying; s.flat = flat;

  const onFocus = useCallback((id: string) => {
    setFocusLocal(id);
    props.onFocusBlock?.(id);
    const m = mapRef.current?.getMap();
    if (m) { s.orbit = false; fly(m, "block", id); }
  }, [props, s]);
  s.onFocus = onFocus;
  /* eslint-enable react-hooks/refs */

  // tile source: local first, live Esri fallback
  useEffect(() => {
    let alive = true;
    fetch("/tiles/16/11898/26483.jpg", { method: "HEAD" })
      .then((r) => (r.ok && (r.headers.get("content-type") ?? "").startsWith("image") ? LOCAL : ESRI))
      .catch(() => ESRI)
      .then((u) => alive && setTileUrl(u));
    return () => { alive = false; };
  }, []);

  // neighbors
  useEffect(() => {
    fetch("/data/neighbors.geojson").then((r) => r.json()).then((fc) => {
      setIllustrative(!!fc.illustrative);
      const out: Neighbor[] = [];
      fc.features.forEach((f: { properties: { kind: Neighbor["kind"]; name: string }; geometry: { type: string; coordinates: number[][] | number[][][] } }, id: number) => {
        const g = f.geometry;
        if (g.type === "Polygon") {
          const ring = (g.coordinates as number[][][])[0].map(([lo, la]) => toLocal(lo, la, ORIGIN));
          const c = centroid(ring);
          const radius = Math.max(...ring.map(([x, y]) => Math.hypot(x - c[0], y - c[1])));
          if (Math.hypot(c[0], c[1]) < 2500) out.push({ id, kind: f.properties.kind, name: f.properties.name, polygon: ring, centroid: c, radius });
        } else if (g.type === "LineString") {
          out.push({ id, kind: "road", name: f.properties.name, line: (g.coordinates as number[][]).map(([lo, la]) => toLocal(lo, la, ORIGIN)) });
        }
      });
      s.neighbors = out;
    }).catch(() => {});
  }, []);

  // frame change: ease
  useEffect(() => {
    s.from = s.shown;
    s.easeT0 = performance.now();
  }, [frame, s]);

  // focus change: drift source
  useEffect(() => {
    s.focus = focusId;
    s.drift.setTrees(getTrees().byBlock[focusId] ?? new Float32Array(0));
    s.zoomed = false;
  }, [focusId, s]);

  // hotkeys / demo panel: uiStore callbacks (merged, not replaced)
  useEffect(
    () =>
      registerUiCallbacks({
        flyOverview: () => { const m = mapRef.current?.getMap(); if (m) { s.orbit = true; fly(m, "overview"); } },
        toggle2D3D: (v) => setFlat(v === "2d"),
      }),
    [s],
  );

  // controls
  /* eslint-disable react-hooks/immutability -- s is a mutable ref-backed state object by design */
  useEffect(() => {
    if (!props.controlsRef) return;
    props.controlsRef.current = {
      flyToOverview: () => { const m = mapRef.current?.getMap(); if (m) { s.orbit = true; fly(m, "overview"); } },
      toggle2D: () => setFlat((f) => !f),
      preset: (p) => { const m = mapRef.current?.getMap(); if (m) { s.orbit = p === "overview"; fly(m, p); } },
    };
  }, [props.controlsRef, s]);
  /* eslint-enable react-hooks/immutability */

  useEffect(() => {
    const m = mapRef.current?.getMap();
    if (!m) return;
    if (flat) fly(m, "top");
    else fly(m, "overview");
  }, [flat]);

  // basemap dimming from sun elevation and storm
  const stormLevel = Math.min(1, frame.weather.rainInHr / 0.3) * 0.7 + (frame.weather.cloudPct / 100) * 0.3;
  useEffect(() => {
    const m = mapRef.current?.getMap();
    if (!m || !m.getLayer("esri")) return;
    const day = Math.min(1, Math.max(0, (frame.sun.elevationDeg + 8) / 20));
    const b = (0.22 + 0.4 * day) * (1 - 0.45 * stormLevel);
    for (const id of ["esri-live", "esri"]) {
      if (!m.getLayer(id)) continue;
      m.setPaintProperty(id, "raster-brightness-max", b);
      m.setPaintProperty(id, "raster-hue-rotate", day < 0.5 ? 12 : 0);
    }
  }, [frame.sun.elevationDeg, stormLevel, tileUrl]);

  const style = useMemo<StyleSpecification | null>(() => {
    if (!tileUrl) return null;
    const ATTR = "Esri, Maxar, Earthstar Geographics";
    const paint = { "raster-brightness-max": 0.5, "raster-saturation": -0.4, "raster-contrast": 0.1 };
    const local = tileUrl === LOCAL;
    // local tiles only exist for zoom 13-17; live Esri sits underneath for the fly-in below zoom 13
    return {
      version: 8,
      sources: {
        ...(local ? { "esri-live": { type: "raster", tiles: [ESRI], tileSize: 256, maxzoom: 17, attribution: ATTR } } : {}),
        esri: { type: "raster", tiles: [tileUrl], tileSize: 256, maxzoom: 17, ...(local ? { minzoom: 13 } : {}), attribution: ATTR },
      },
      layers: [
        { id: "bg", type: "background", paint: { "background-color": "#0a0f1a" } },
        ...(local ? [{ id: "esri-live", type: "raster", source: "esri-live", paint }] : []),
        { id: "esri", type: "raster", source: "esri", paint },
      ],
    } as StyleSpecification;
  }, [tileUrl]);

  const [range, setRange] = useState<[number, number]>([60, 70]);
  useAnimationLoop((dt, t) => {
    const ov = overlayRef.current;
    const map = mapRef.current?.getMap();
    if (!ov || !map) return;
    const p = s.p, fr = p.frame;
    // ease
    const k = (performance.now() - s.easeT0) / EASE_MS;
    if (k < 1.02) { s.shown = easeLayers(s.from, fr.layers, k); s.ver++; }
    else if (s.shown !== fr.layers) { s.shown = fr.layers; s.ver++; }
    const layers = s.shown;
    const upper = layers.find((l) => l.heightFt === fr.tower.upperFt);
    // box mode
    const zoomed = map.getZoom() > 16.2;
    if (zoomed !== s.zoomed) {
      s.zoomed = zoomed;
      if (zoomed) {
        const b = BLOCKS.find((x) => x.id === s.focus);
        const c = b ? centroid(b.polygon) : [0, 0];
        s.wind.respawn({ minX: c[0] - 150, maxX: c[0] + 150, minY: c[1] - 150, maxY: c[1] + 150 });
      } else s.wind.respawn({ minX: FB.minX - 100, maxX: FB.maxX + 100, minY: FB.minY - 100, maxY: FB.maxY + 100 });
    }
    const gustPulse = 0.5 + 0.5 * Math.sin(t * 1.7);
    const base = upper?.windMph ?? 1;
    const gustLen = 1 + Math.min(2, Math.max(0, fr.weather.gustMph - base) / Math.max(base, 3)) * gustPulse;
    const lidFt = lidHeightFt({ layers, derived: fr.derived });
    const behavior = driftBehavior(fr, p.assessment);
    s.wind.update(dt, layers, 1.1 * gustLen);
    s.drift.update(dt, layers, behavior, s.spraying, 0.9 * (behavior.regime === "storm" ? 1.8 : 1));
    s.rain.update(dt, fr.weather.rainInHr, upper);
    // neighbor flashes
    if (++s.flashTick % 8 === 0) {
      const fl = new Set<number>();
      if (s.spraying) for (const n of s.neighbors) {
        if (!n.centroid || n.kind === "road") continue;
        for (let i = 0; i < s.drift.head.length / 3; i += 3) {
          if (s.drift.age[i] < 1) continue;
          if (Math.hypot(s.drift.head[i * 3] - n.centroid[0], s.drift.head[i * 3 + 1] - n.centroid[1]) < (n.radius ?? 10) + 15) { fl.add(n.id); break; }
        }
      }
      s.flashed = fl;
    }
    // orbit
    s.idleSince += dt;
    if (s.orbit && !s.flat && !map.isMoving() && s.idleSince > 6) map.setBearing(map.getBearing() + 1.5 * dt);
    let tMin = Infinity, tMax = -Infinity;
    for (const l of layers) { tMin = Math.min(tMin, l.tempF); tMax = Math.max(tMax, l.tempF); }
    const pad = Math.max(0, 2 - (tMax - tMin)) / 2;
    const ctx: SceneCtx = {
      frame: fr, assessment: p.assessment, layers, ver: s.ver, tSec: t, focusId: s.focus, flat: s.flat,
      origin: [ORIGIN.lon, ORIGIN.lat], lidFt, tMin: tMin - 1 - pad, tMax: tMax + 1 + pad,
      trees: getTrees().all, neighbors: s.neighbors, flashed: s.flashed, behavior,
      wind: s.wind.buf, drift: s.drift.buf, rain: s.rain.buf, driftN: s.drift.active, rainN: s.rain.active, windN: Math.min(layers.length, s.wind.layerCount) * WIND_PER_LAYER,
      gustLen, stormLevel, onFocus: s.onFocus, spraying: s.spraying,
    };
    setRange((r) => (Math.abs(r[0] - ctx.tMin) > 0.2 || Math.abs(r[1] - ctx.tMax) > 0.2 ? [ctx.tMin, ctx.tMax] : r));
    ov.setProps({ layers: buildLayers(ctx) });
  });

  const onLoad = useCallback(() => {
    const m = mapRef.current?.getMap();
    if (!m) return;
    // maplibre-gl 6 hides map.transform, which @deck.gl/mapbox 9.4 reads; expose it from the camera.
    if (!(m as unknown as { transform?: unknown }).transform) {
      try {
        Object.defineProperty(m, "transform", { get: () => (m as unknown as { _camera?: { transform: unknown } })._camera?.transform, configurable: true });
      } catch {
        /* older maplibre exposes transform already */
      }
    }
    { const ov = makeOverlay(); m.addControl(ov as never); overlayRef.current = ov; }
    m.on("dragstart", () => { s.orbit = false; });
    m.on("mousedown", () => { s.idleSince = 0; });
    m.on("error", (e) => { if ((e.error as { status?: number })?.status === 404 || String(e.error).includes("Failed to fetch")) setNoTiles(false); });
    fly(m, s.flat ? "top" : "overview");
  }, []);

  const timeLabel = new Date(frame.time).toLocaleString("en-US", { timeZone: "America/Phoenix", weekday: "short", hour: "numeric", minute: "2-digit" });

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
      {style && (
        <MapGL
          ref={mapRef}
          mapLib={maplibregl}
          mapStyle={style}
          initialViewState={{ longitude: SW_ARIZONA.center[0], latitude: SW_ARIZONA.center[1], zoom: SW_ARIZONA.zoom, pitch: 0, bearing: 0 }}
          maxPitch={80}
          maxZoom={19}
          attributionControl={false}
          onLoad={onLoad}
          style={{ width: "100%", height: "100%" }}
        />
      )}
      <Overlay
        status={assessment.status}
        topReason={assessment.reasons[0]?.text ?? assessment.dropletNote}
        timeLabel={timeLabel}
        tMin={range[0]} tMax={range[1]}
        focusId={focusId}
        onFocus={onFocus}
        onOverview={() => uiActions.flyOverview()}
        onToggle2D={() => uiActions.toggle2D3D()}
        flat={flat}
        spraying={spraying}
        onSpray={setSpray}
        illustrative={illustrative}
        noTiles={noTiles}
      />
    </div>
  );
}
void FARM_CENTER;
