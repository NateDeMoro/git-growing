# Spray or Wait index

| File | Description | Open when |
|---|---|---|
| src/components/ui/UiData.tsx | Single data seam: live poll (60 s), week.json playhead driver, assess, logging, forecast, one early warning (forecast.earlyWarning) for Now + Forecast | any data/playback/log bug |
| src/lib/uiStore.ts | Playback/UI store, uiActions, registerUiCallbacks | wiring hotkeys, camera, playback |
| src/lib/log.ts | Log store (cap 5000), CSV | log or export bugs |
| src/lib/assessCache.ts | Memoized assess per product+frame | status lags after product change |
| src/lib/nozzles.ts, data/nozzles.json | Droplet class -> nozzle type, ISO 10625 color/size, psi range, sources | changing nozzle advice or its data |
| src/lib/simLogger.ts | Log entry builder + frame-scanning sim logger | log dedupe/replay issues |
| src/lib/engine/action.ts | Pure "Do this" sentence from assessment + next safe window + early warning | changing the action wording |
| src/components/NowPanel.tsx | Now tab: map, verdict bar (StatusCard), Reasons (+Why these limits modal), DropletAdvice, Readings, bottom product + playback bars | Now tab layout |
| src/components/ForecastChart.tsx | 7-day 5 ft / 30 ft temps + NWS mixing height | forecast chart |
| src/lib/stationFrame.ts | AZMet reading -> single-layer frame | station card |
| src/lib/forecast.ts | W5: frames from hours, windows, next GO, early warning, wobble | /api/now, /api/forecast, forecast UI |
| src/components/DemoPanel.tsx | Global hotkeys + hidden panel | changing keys |
| src/lib/engine/assess.ts | Pure risk engine: status, reasons, droplet recommendation | changing a rule or cutoff (cutoffs live in thresholds.ts) |
| src/lib/derive.ts | Hourly model record -> SceneFrame (5/30 ft tower, layers) | tower values look wrong |
| scripts/build-sim.ts, public/sim/week.json | Deterministic sim week with Beats A-F | changing beats; rerun `npm run build-sim` |
| src/lib/data/ | Open-Meteo, NWS, AZMet adapters + snapshot fallback (5 s deadline) | API or offline issues |
| src/components/scene/ | MapLibre + deck.gl 3D farm (W7) | 3D bugs; worker copy in public/ |
| README.md | Run steps, sources, what is simulated, demo script | presenting |
