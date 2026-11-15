# W4 2D UI index

| File | Description | Open when |
|---|---|---|
| src/components/ui/UiData.tsx | Single data seam: live poll (60 s), week.json playhead driver, assess, logging, look-ahead, forecast, AZMet | any data/playback/log bug |
| src/lib/uiStore.ts | Playback/UI store, uiActions, registerUiCallbacks | wiring hotkeys, camera, playback |
| src/lib/log.ts | Log store (cap 5000), CSV | log or export bugs |
| src/lib/assessCache.ts | Memoized assess per product+frame | status lags after product change |
| src/lib/simLogger.ts | Log entry builder + frame-scanning sim logger | log dedupe/replay issues |
| src/components/ForecastChart.tsx | 7-day 5 ft / 30 ft temps + NWS mixing height | forecast chart |
| src/lib/stationFrame.ts | AZMet reading -> single-layer frame | station card |
| src/lib/forecast.ts | W5: frames from hours, windows, next GO, early warning, wobble | /api/now, /api/forecast, forecast UI |
| src/components/DemoPanel.tsx | Global hotkeys + hidden panel | changing keys |
