# W4 2D UI index

| File | Description | Open when |
|---|---|---|
| src/components/ui/UiData.tsx | Single data seam (mock driver, stub assess, log append) | W6 wiring real data |
| src/lib/uiStore.ts | Playback/UI store, uiActions, registerUiCallbacks | wiring hotkeys, camera, playback |
| src/lib/log.ts | Log store (cap 5000), CSV | log or export bugs |
| src/lib/stubAssess.ts, stubForecast.ts | TEMPORARY, W6 deletes | swapping in engine/forecast |
| src/components/DemoPanel.tsx | Global hotkeys + hidden panel | changing keys |
| tests/fixtures/mock48.json | 48 mock frames + beats A-F | W3 frames48 lands (delete) |
