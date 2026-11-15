# Spray or Wait · by GitGrowing

Hack Arizona AgX HackDay, Nov 15, 2026 (pesticide drift track).

Spray or Wait tells an orchard applicator at the University of Arizona Yuma Mesa citrus farm (Somerton, AZ, about 240 acres) whether it is safe to spray right now, and why. It reads temperature and wind from a two-height weather tower (5 ft and 30 ft), scores them with published spray-drift rules, and shows Go, Caution or Stop with plain-language reasons and their sources. The only thing the applicator picks is the pesticide. The app recommends which nozzle to fit.

Production: https://git-growing.vercel.app

## What it does
- **Now:** the verdict with a one-line "Do this" action and any early warning. A CAUTION always says either "Spray with care: OK to spray if…" or "Wait until…". When a 5 ft-only ground station would have said spray but the tower says no, a line shows what the station alone would say. Below it come the reasons tagged with their source, the nozzle to fit (droplet class per ASABE S572.3, nozzle size per the TeeJet airblast chart and ISO 10625 colors), and both tower heights side by side. A "Why these limits" link lists every rule with its source and kind (standard, guidance or heuristic). The pesticide picker sits in the bottom bar.
- **Speed up time:** plays a fixed, simulated week (2,016 five-minute frames) with six scripted beats. Status is computed live, so changing the product changes the verdicts.
- **Forecast:** 7-day strip of safe and unsafe hours, the next safe window (at least 2 h of GO), an early-warning banner, and a 5 ft / 30 ft temperature chart with a tower selector.
- **Log:** every status change and every sim-hour or live poll, stored in the browser, exportable as CSV.
- **3D map:** MapLibre + deck.gl over Esri imagery. Farm blocks, about 23,000 trees, the tower with 5 ft and 30 ft readings, wind particles per height, rain and storm effects, a compass, and turn-left/right controls (buttons or arrow keys). Heights are exaggerated 10x.

## Run it
```
npm install
npm run dev          # http://localhost:3000
npm test             # unit + demo-scenario tests
npm run build && npm run start   # offline backup for the demo
```
Simulate mode needs no network: the week, calibration, and map tiles (`public/tiles`) are committed. Every live API has a committed snapshot fallback (`data/snapshots`). Add `?offline=1` to any API route to force the snapshot.

Regenerate data (needs network): `npm run snapshot`, `npm run fetch:products`, `npm run fetch:tiles`, `npm run calibrate`, `npm run build-sim` (`-- --check` confirms the committed week rebuilds byte for byte).

## Data sources
| Source | Used for |
|---|---|
| Open-Meteo forecast and historical-forecast APIs | Hourly weather at 2 m, 10 m and 80 m+, the 7-day forecast, the sim week (Oct 25-31, 2026) and calibration (2024-2026) |
| PubChem PUG View | Vapor pressure of each active ingredient, banded with the PPDB/EFSA thresholds |
| Esri World Imagery | Basemap tiles (committed for zoom 13-17) |

## Rule sources
Battany 2017 (inversion 1.8°F between heights), Faber 2015 UC ANR (inversion timing), the track brief and Liberty ULTRA label (3 to 10 mph wind window, 2-minute average), GRDC 2025 (Delta T), AMS Glossary (rain intensity), NWS FMH-1 PRESFR (falling pressure), PPDB/EFSA (volatility bands), ANSI/ASABE S572.3 (droplet classes). Gust and shear cutoffs and the rain-chance check are our own tunable heuristics, labeled as such in the app.

## What is simulated (say this when presenting)
- **The tower is simulated.** There is no physical tower. 5 ft and 30 ft values are derived from Open-Meteo model levels, with the 30 ft temperature calibrated (k = 1.348) so the median nightly inversion matches Battany's published 2-3°C.
- **The week is simulated.** A real October week at the farm with scripted beats overlaid, including a simulated frontal storm (Beat F).
- **Labels are illustrative.** Wind limits and minimum droplet classes per product are illustrative, flagged "check label".
- **Blocks were traced by hand** from Esri imagery. Block names are our labels.
- **Live readings wobble.** The Live reading adds a small, deterministic per-minute wobble so the sensor looks alive. It never changes the inversion or crosses a wind cutoff.

## Demo script
Press the backtick key to show the hidden demo panel. Hotkeys work with the panel hidden.

| Key | Action |
|---|---|
| 1-6 | Jump to Beats A-F |
| Space | Play / pause |
| [ ] | Speed 0.25, 1 or 6 sim-hours per second |
| R | Clear the log |
| F | Fly to the whole-farm overview |
| V | Toggle 2D / 3D |
| L | Switch Live / Simulate |

1. **Live:** open the page. It shows the current Yuma reading and a "cached data" chip if a source fell back.
2. **Beat A (press 1), the tiebreaker:** at 5 ft it reads 72°F and 5 mph, which a single ground station would call fine. The tower's 30 ft sensor is 3°F warmer, so it says STOP: an inversion, and no nozzle fixes it. The verdict bar shows "Ground station alone (5 ft): GO, blind to the 30 ft layer" under the tower's STOP. In 3D, compare the two tower labels.
3. **Beat B (2):** the inversion breaks after sunrise and a GO window opens.
4. **Beats C and D (3, 4):** wind at 30 ft ramps past the label limit, then the wind direction splits 120° between heights. The arrows and particle streams pull apart.
5. **Beat E (5):** a calm, clear evening. The timing hint gives a CAUTION before the inversion fully forms: "Spray with care: don't start a new block; finish the one you're on."
6. **Beat F (6), the storm:** the early warning fires hours ahead. Pressure falls, cloud and rain build, gusts reach 40 mph, and status walks GO, CAUTION, STOP.
7. **Product:** switch to the 2,4-D ester (high volatility). Any inversion is STOP, and vapor caution appears when an inversion is forecast.
8. **Forecast tab:** next safe window and early warning. **Log tab:** Download CSV.
