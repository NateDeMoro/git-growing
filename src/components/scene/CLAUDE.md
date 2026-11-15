# 3D scene index

| File | Open when... |
|---|---|
| Scene3D.tsx | changing props (controlsRef, focusedBlockId, onFocusBlock) or the client-only dynamic import |
| SceneMap.tsx | changing map setup, animation tick, easing, tile fallback, deck overlay wiring |
| layers/index.ts | adding or restyling a deck layer (all layers built per tick) |
| sim.ts | changing wind, drift or rain particle behaviour (typed arrays, local metres from tower) |
| camera.ts | changing presets, fly-in, block focus |
| Overlay.tsx | changing HTML chrome (status pill, compass + rotate buttons, block list, buttons) |
| ../../lib/scene/*.ts | pure helpers (geometry 10x factor, wind, lid (drift only), drift, trees, advect, ease); tested in tests/scene.test.ts |

Notes: maplibre worker is served from public/maplibre-gl-worker.mjs (copy from node_modules/maplibre-gl/dist after upgrades). SceneMap shims map.transform for deck. Tiles: /tiles/{z}/{x}/{y}.jpg (W1) else live Esri.
