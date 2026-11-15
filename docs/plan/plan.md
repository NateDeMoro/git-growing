---
issue: n/a
kind: feature
opener: user (verbal)
status: planned
last_updated: 2026-11-15
---

# Plan: Spray Window data, NOW engine, speed-up-time simulation and 7-day forecast

## C. Change spec

### 0. Target branch and execution model
Work lands on `main` of /Users/natedemoro/Code/Git_Growing (remote github.com/NateDeMoro/git-growing). No PRs. The coordinator session (run under /goal, fully autonomous) builds Phase 0 itself on main. It then starts each later piece as a subagent in its own git worktree under /Users/natedemoro/Code/Git_Growing-wt/<piece>, on a branch named `piece/<name>` cut from the current main. When a piece finishes, a fresh review subagent reads its diff against this plan while the coordinator keeps working. The coordinator then applies any fixes, rebases the branch on main, runs `npm run build` and `npm test`, fast-forwards main, pushes, and removes the worktree. The 3D teammate pushes to main too, so always pull before rebasing.

### 1. Abstract
A single-page Next.js site called Spray Window tells an orchard applicator whether it is safe to spray right now, and why. It reads temperature and wind at 5 ft and 30 ft from a simulated tower, plus humidity, sun position, cloud and rain from real forecast data. The only thing the applicator picks is the pesticide; its volatility and label limits feed the rules. The tool then recommends a droplet size (the finest class that is still safe, since finer drops cover the canopy better), or says no droplet size makes it safe. The site is fixed to one orchard: a Yuma, Arizona citrus farm. Every check and status change goes to a time-stamped log that exports as CSV. A "speed up time" button plays a fixed, precomputed week of tower data so the 3D scene and the status visibly change, for example "wind shifts aloft, now STOP". A forecast tab runs the same rules on the next 7 days of Open-Meteo data and shows the safe and dangerous spray windows, plus the next safe window. A "single ground station" card runs the same engine on 5 ft data only, which proves the tiebreaker point: the station says GO while the tower says STOP.

### 2. Scope
NOW panel with Go/Caution/Stop and reasons. Product picker (volatility from PubChem), the only user input. Recommended droplet class (ASABE S572) as an output. Fixed location: Yuma citrus orchard. Single-station comparison, including the real AZMet Yuma station reading. Speed-up-time playback over a committed week of frames. Time-stamped log with CSV export. 7-day forecast windows with a "turns bad in N hours" warning. Real data adapters with committed snapshot fallbacks. A frame contract and placeholder slot for the teammate's 3D component. Vercel production deploy.

### 3. Files touched (all new)
- `package.json`, Next.js config, `tsconfig.json`, Tailwind config, `vitest.config.ts`: scaffold from create-next-app (TypeScript, App Router, `src/` dir, Tailwind, ESLint), plus vitest, recharts, suncalc.
- `src/lib/contract.ts`: shared types for the 3D teammate and every piece: SceneFrame, Layer, Assessment, Reason, Status, Product, DropletClass, LogEntry, ForecastWindow. Owned by Phase 0; later pieces add fields only after asking the coordinator.
- `src/lib/thresholds.ts`: every rule threshold in one table, each with a one-line source note (track text, Battany 2017, Faber 2015, Delta T guidance).
- `src/lib/products.ts` and `data/products.json`: about six orchard active ingredients spanning low, medium and high vapor pressure, with PubChem CID, vapor pressure, volatility band, and an illustrative label wind maximum flagged "check label".
- `src/lib/droplets.ts`: the eight ANSI/ASABE S572.3 classes from Extremely Fine to Ultra Coarse, in order, plus a one-line "how to get it" hint per class (for example "air-induction nozzles or lower pressure"). Each product in `data/products.json` also carries a label minimum droplet class.
- `src/lib/site.ts`: the one fixed orchard. University of Arizona Yuma Mesa Farm (2176 W County 15th St, Somerton, AZ; 240-acre UA citrus research farm). Geocoding the address returned nothing, so the implementer opens Esri World Imagery near 32.61, -114.64, traces the whole farm outline and every visible citrus block inside it. Each block gets a polygon of 4 to 8 corners, a tree-row bearing, and a generic name ("Block A", "Block B" and so on) unless the imagery shows real labels. One weather tower serves the whole farm, placed at the farm center or at the edge of the most central block, and that tower point feeds every data pull. A default focused block is set for the demo. Timezone America/Phoenix, crop "citrus". AZMet Yuma stations confirmed: az02 Yuma Valley, az14 Yuma N.Gila, az36 Yuma South; use the nearest (likely az36).
- `src/lib/engine/` (`assess.ts`, `wetbulb.ts`, `sun.ts`): the pure risk engine (Phase 1, piece W2).
- `src/lib/data/` (`openMeteo.ts`, `nws.ts`, `azmet.ts`, `snapshot.ts`): fetchers that normalize into hourly records, falling back to snapshots (W1).
- `scripts/fetch-products.ts`, `scripts/snapshot.ts`: one-time fetchers that write `data/products.json` and `data/snapshots/*.json` (W1).
- `src/lib/derive.ts`: turns an hourly model record into a SceneFrame's layers at 5, 35 and extra heights, using the calibration (W3).
- `scripts/calibrate.ts` and `data/calibration.json`: fit from the historical API (W3).
- `scripts/build-sim.ts` and `public/sim/week.json`: deterministic 7-day simulation at 5-minute steps with scripted demo beats (W3).
- `src/lib/forecast.ts`: per-hour assessment, merged into windows, next safe window and early warning (W5).
- `src/app/api/now/route.ts`, `src/app/api/forecast/route.ts`: JSON endpoints (W1 skeleton, W5 wiring).
- `src/app/page.tsx` plus `src/components/` (NowPanel, ReasonList, ReadingsCard, StationCompare, ProductPicker, DropletAdvice, PlaybackBar, ForecastStrip, NextWindowCard, LogTable, TowerChart, MastSVG, WindChart, WindCompass, WindowDial, DemoPanel, FrameProvider): the UI (W4, wired in W6). The 3D map lives in `src/components/scene/` (W7, see section 12).
- `src/lib/log.ts`: localStorage log store and CSV export (W4).
- `tests/`: the integration test and a handful of unit tests (see Testing).
- `README.md`: how to run, data sources, what is simulated, the demo script.

### 4. Approach
Everything flows through one data shape, the SceneFrame, and one pure function, the engine's assess. Live mode, simulation playback and forecast all produce SceneFrames. The engine scores each frame against the selected product and droplet class. The UI and the 3D scene only read frames and assessments. The tower physics follows Battany 2017: two sensors at 1.5 m and 10.7 m, 5-minute readings, and 1.0°C (1.8°F) of inversion as meaningful. The upper sensor is labeled 30 ft (9.1 m) to match the track text and the teammate outline, and the same threshold applies. The inversion timing hints come from Faber 2015. No in-repo precedent exists. The main design risk is the 3D contract, so Phase 0 freezes it before anything runs in parallel.

### 5. Changes by structure
a. **Migrations:** none. No database.

b. **Data and business logic.**
- **Engine rules.** Every cutoff lives in `src/lib/thresholds.ts` with a source record: title, URL, and a kind. The kind is "standard" (a published standard or label requirement), "guidance" (extension or research guidance) or "heuristic" (our tunable choice where no standard exists). Reasons show the source's short name. A "Why these limits" panel on the Now tab lists every rule with its cutoff, kind and link, so judges can check them.
  - The status is the worst status any rule returns. Reasons are sorted worst first.
  - Each reason carries a rule id, a status, plain-language text with the actual numbers, and the source tag. Example: "It is 3.1°F warmer at 30 ft than at 5 ft: a temperature inversion is trapping spray near the ground. (Battany 2017; label: do not apply during inversions)".
  - **Inversion** (30 ft temp minus 5 ft temp):
    - 1.8°F (1.0°C) or more is STOP. Sources: Battany 2017 (UCCE, GiESCO; 1.0°C between 1.5 m and 10.7 m marks a meaningful inversion), plus standard label language "DO NOT apply during temperature inversions" (example: Liberty ULTRA label 2024, https://cropsandsoils.extension.wisc.edu/files/2024/11/Figure-1-Liberty-ULTRA-Label-2024.pdf).
    - Above 0 but under 1.8°F is CAUTION. Source: the track brief ("flag when the upper temperature is higher than the lower one"). The cutoff below 1.8°F stays CAUTION because the difference is within a sensor's typical error.
    - No droplet size clears an inversion STOP.
  - **Wind window** on the 2-minute average at both heights:
    - Below 3 mph is CAUTION, and STOP when combined with an inversion.
    - Above the product's label maximum (default 10 mph) is STOP.
    - Sources: the track brief (3 and 10 mph "common guidance; actual limits depend on the pesticide label"). The 3 mph floor and the 2-minute averaging period match the Liberty ULTRA label's sustained-wind definition, which uses the NWS 2-minute average.
    - Within 2 mph of the maximum is CAUTION (heuristic early warning).
  - **Gusts:**
    - Gusts above the maximum are CAUTION, and more than 10 mph over it are STOP.
    - Kind: heuristic. No published gust cutoff was found, and labels generally just say to avoid gusty conditions. Label it that way in the UI.
  - **Speed and direction shear:**
    - Speed difference of 5 mph or more is CAUTION, and 10 mph or more is STOP.
    - Direction difference of 45° or more is CAUTION, and 90° or more is STOP, applied only when both speeds are at least 2 mph.
    - Source for flagging at all: the track brief ("flag large differences in wind speed or direction between heights").
    - Kind for the numbers: heuristic. No published shear cutoffs were found. Say so in the UI and make them tunable in thresholds.ts.
  - **Delta T** at 5 ft (dry bulb minus wet bulb, wet bulb via Stull 2011, J. Appl. Meteor. Climatol. 50:2267). Source: GRDC "Practical tips for spraying" fact sheet, Jan 2025 (https://grdc.com.au/resources-and-publications/all-publications/factsheets/2025/practical-tips-for-spraying).
    - Under 2°C is CAUTION.
    - 2 to 10°C is GO. GRDC names 2 to 8 as the common guideline and caution above 10.
    - 10 to 12°C is CAUTION and requires Very Coarse or larger droplets.
    - Over 12°C is STOP.
  - **Volatility:**
    - Product bands use PubChem vapor pressure converted to mPa, with the PPDB/EFSA bands: under 5 mPa low, 5 to 10 moderate, over 10 high. Source: University of Hertfordshire PPDB background document, citing EFSA Journal 2014;12(10):3874 (https://sitem.herts.ac.uk/aeru/iupac/docs/5_1.pdf); the band table is stated at 25°C, so convert PubChem's 25°C values directly.
    - For a high-volatility product, any inversion is STOP, even under 1.8°F.
    - It also adds a CAUTION "vapor can keep moving for hours after application" whenever an inversion is forecast within the next 12 hours. Source: EPA drift guidance and the track's "key terms" definition of volatility.
    - No temperature cutoff: none was found in a standard, so the earlier 85/90°F trigger is dropped.
  - **Inversion-timing hint:** from 3 hours before sunset until 1 hour after sunrise, with cloud at 25% or less, it adds CAUTION "inversion likely forming or present". Source: Faber 2015, UC ANR Topics in Subtropics ("begin 3-4 hours before sunset ... dissipate no longer than an hour or so after sunrise"; overnight cloud cover 25% or less). This hint is the only inversion signal in single-station mode.
  - **Rain:**
    - Light rain (0.10 in/hr or less) is CAUTION.
    - Moderate or heavy rain (over 0.10 in/hr) is STOP.
    - Source: AMS Glossary of Meteorology, "Rain" (light up to 0.10 in/hr, moderate 0.11 to 0.30, heavy over 0.30; https://glossary.ametsoc.org/wiki/Rain).
    - A rain probability over 50% in the next 2 hours is CAUTION "check the label's rainfast period" (heuristic).
  - **Storm approaching:** station pressure falling at 0.06 inHg (about 2.0 hPa) per hour or faster adds CAUTION. Source: the NWS/FMH-1 "PRESFR" (pressure falling rapidly) observing criterion, also in AFMAN 15-111. The frames carry a pressure history so this can be computed.
  - **Droplet recommendation:**
    - Classes follow ANSI/ASABE S572.3 (Feb 2020): Extremely Fine, Very Fine, Fine, Medium, Coarse, Very Coarse, Extremely Coarse, Ultra Coarse.
    - After the weather rules, run assess once per class, from the product's label minimum class up to Ultra Coarse. Class-dependent rules are only those with a source: the GRDC Delta T 10 to 12°C rule needs Very Coarse or larger, and the product's label minimum class applies.
    - Recommend the finest class whose status is GO, because finer drops cover citrus canopy better. If none reaches GO, recommend the finest CAUTION class with its reasons. If every class is STOP, say "no droplet size makes this safe" and name the cause.
    - The recommendation is part of the Assessment and shows on the status card and in the log. The main status shown is the one at the recommended class, or STOP when no class works.
  - **Single-station mode** runs the same engine on 5 ft data only, skipping the inversion and shear rules. The comparison card uses it.
- **Calibration** (scripts/calibrate.ts, run once at build time, output committed).
  - Pull 2024-01-01 to 2026-11-01 hourly from the historical API for the Yuma site. If k fitted for Yuma looks unreasonable, fall back to k from the same method using Battany's 2–3°C target.
  - Wind at 5 ft and 30 ft comes from a per-hour power law fitted between the 10 m and 80 m winds.
  - Temperature at 5 ft is the 2 m value. Temperature at 30 ft is a log-height interpolation between 2 m and 80 m, scaled by a factor k.
  - k is chosen so the median nightly maximum inversion lands at 2.5°C, the middle of Battany's typical 2–3°C.
  - Write k, the fitted exponents' median, and summary stats (share of night hours inverted, median inversion) to `data/calibration.json`. The README and a UI footnote say plainly that tower values are derived from model data and calibrated to published tower magnitudes.
- **Derive** (src/lib/derive.ts): one hourly record plus the calibration becomes a SceneFrame. Layers sit at 5, 15, 35, 60, 100, 160 and 260 ft, so the 3D scene has a full column of air to draw. Each layer has temperature, wind speed and wind direction. The frame also carries the derived summary (inversion °F, speed shear, direction shear, Delta T, RH), sun elevation from suncalc, cloud percentage, rain rate (in/hr), gusts, surface pressure, and a drift vector. Simulation frames also carry the look-ahead field (next beat and status 3 sim-hours later).
  - The drift vector's direction is the 30 ft wind's downwind bearing.
  - Its strength (0 to 1) scales with inversion strength and wind speed. It is presentation-only, for the 3D scene.
- **Simulation** (scripts/build-sim.ts, output `public/sim/week.json`, committed).
  - Take a fixed real week from the historical API and derive frames hourly, interpolated to 5-minute steps (2,016 frames).
  - Add seeded noise from a fixed-seed generator in the script. Runtime never uses randomness.
  - Overlay scripted demo beats, each marked in the file with a label and frame index so the UI can offer "jump to next beat":
    - **Beat A:** evening day 1. The 5 ft station reads 5 mph and 72°F and looks fine, but 30 ft is 3°F warmer, so the tool says STOP while the single station says GO. This is the track's required demo.
    - **Beat B:** the next morning, the inversion breaks about 1 hour after sunrise and a GO window opens.
    - **Beat C:** an afternoon where the 30 ft wind ramps past 12 mph while 5 ft stays near 6 mph, giving STOP for wind and speed shear.
    - **Beat D:** direction shear of 120° between heights.
    - **Beat E:** a calm, clear evening where the timing hint fires before the inversion fully forms. Status goes CAUTION, then STOP.
    - **Beat F, severe storm:** mid-week, a frontal storm built over about 12 sim-hours.
      - Build-up: GO hours, then cloud cover climbs to 100% and pressure falls about 6 hPa, including about 2 hours at 2.0 hPa per hour or faster, firing the PRESFR "storm approaching" CAUTION.
      - Peak: wind rises from about 6 to 25 mph sustained with gusts near 40, and the 30 ft direction swings about 90 degrees ahead of the 5 ft one. Rain rises from drizzle to about 0.4 in/hr, and temperature drops about 12°F.
      - Status walks GO, CAUTION, STOP and back to CAUTION as the storm clears.
      - The frames carry rain rate, gusts, cloud and pressure, so the panels and the 3D scene show it building.
      - The simulation includes a look-ahead field per frame: the next beat start and the status 3 sim-hours later. This lets the early-warning banner say "storm arriving in 3 hours" during playback.
  - Frames hold readings only. Status is computed live by the engine during playback, so changing the product changes the sim's verdicts and droplet recommendations.
- **Forecast** (src/lib/forecast.ts).
  - Fetch the 7-day Open-Meteo forecast, derive a frame for each hour and assess each one. Merge consecutive same-status hours into windows.
  - Return the windows, the next GO window that lasts at least 2 hours, and an early warning: the first hour within the next 6 where the status gets worse than now, with its reason.
  - Overlay the NWS mixing height and transport wind as extra lines when available. These are context only, not rule inputs.
- **Products** (scripts/fetch-products.ts): look up the PubChem vapor pressure for each chosen CID. Convert it to mPa at about 25°C and assign the PPDB/EFSA band: low under 5, moderate 5 to 10, high over 10. Hand-pick about six ingredients that orchards and tree nuts commonly use, with a spread of bands.
- **AZMet:** Yuma has AZMet stations (Yuma Valley, and likely Yuma Mesa and North Gila; the implementer confirms ids from the API). The single-station card shows the nearest one's latest real hourly reading as "regional station" next to our 5 ft reading, run through single-station mode. If AZMet is down, fall back to the snapshot.

c. **Endpoints.**
- `GET /api/now?offline=0|1` returns the current hour's derived frame. A small seeded wobble, keyed to the minute, makes the simulated sensor look alive. The response also carries the data timestamp and source names.
- `GET /api/forecast?offline=0|1` returns hourly frames for 7 days plus the NWS overlay.
- `GET /api/station?offline=0|1` returns the latest AZMet Yuma reading, normalized.
- Both fall back to the committed snapshot when an upstream call fails or `offline=1` is set, and the response says which source was used. Assessment happens on the client, so the product and droplet pickers react instantly.

d. **Views.** One page at `/` with three tabs.
- **Now:**
  - Left: the 3D slot.
  - Right: a big status card with the top reason, the full reason list, a readings card showing both heights side by side, the droplet advice card (recommended class, how to get it, and the coverage tradeoff), the station comparison card, and the product picker. The header names the site: Yuma citrus orchard.
  - Bottom: the playback bar, with Live / Simulate toggle, play/pause, speeds of 1 sim-hour per second and 6 sim-hours per second, a 7-day scrubber with beat markers, and "next beat".
  - A two-line tower chart in Battany's style (5 ft and 30 ft temperature over the last 24 sim-hours).
- **Forecast:** a 7-day strip colored per hour by status. A next-safe-window card. An early-warning banner. A line chart of the two derived temperatures with the NWS mixing height on a second axis.
- **Log:** a table of time, mode (live/sim/forecast), status, triggers and readings. Download CSV and Clear buttons.

e. **Components.**
- **FrameProvider** owns the current frame (live poll every 60 s, or the sim playhead) and exposes a hook used by every panel and by Scene3D.
- **Scene3D** is the 3D orchard map (section 12). Phase 0 ships a placeholder with the same props so the page works before W7 lands.

f. **Utils.**
- Wet bulb (Stull 2011).
- Unit conversions (km/h to mph, C to F, metres to feet).
- Angular difference.
- The log store: append on every status change and once per sim-hour or live poll, capped at 5,000 entries, persisted in localStorage inside try/catch with an in-memory fallback.
- CSV export with proper quoting.

### 6. Core commitment
One pure `assess(frame, product, mode)` in `src/lib/engine/assess.ts` that turns a two-height frame into a status, plain-language reasons and a recommended droplet class. Live readings, the speed-up-time week and the 7-day forecast all go through it. The committed `public/sim/week.json` guarantees Beat A (ground says GO, tower says STOP) plays the same every time.

### 7. Behaviour preserved
Nothing exists yet. Contract stability for the 3D teammate is the one thing to protect. After Phase 0, fields in `src/lib/contract.ts` can only be added, never renamed or removed.

### 8. Out of scope
- **LLM-written explanations:** deferred because template reasons with real numbers meet the rubric and need no key or latency.
- **SMS or push alerts, physical sensor:** deferred because they're stretch goals the team didn't pick.
- **OpenStreetMap sensitive sites:** deferred because the query was untested and failed once.
- **Shared server-side log:** deferred by the team's choice of browser storage.
- **The 3D scene itself:** the teammate owns it.
- **Model training beyond calibration:** deferred because it's the team's choice for speed.

### 9. Conflict and sequencing
- **3D work:** built in this run as W7. The teammate's outline ("Spray or Wait Functional Plan") is folded in; its FastAPI, SQLite and server-sent-events back end is dropped in favor of this plan's Next.js, Vercel and browser-log stack.
- **Blocks:** Phase 0 must be on main before the teammate starts wiring. Tell the user when it is pushed.
- **Lockfile:** Phase 1 pieces add npm dependencies independently, so `package-lock.json` conflicts are expected. Resolve them by taking main's lockfile, re-running npm install with the piece's dependencies, and committing.

### 10. Execution order (resume checklist)
1. **Phase 0, coordinator on main:**
   - `cd` /Users/natedemoro/Code/Git_Growing and pull.
   - Run create-next-app into the existing folder, keeping README.md and .gitignore.
   - Add vitest, recharts and suncalc.
   - Write contract.ts, site.ts, thresholds.ts, droplets.ts and a products.ts stub with two hand-entered products.
   - Add the FrameProvider with one mock frame, the Scene3D placeholder, the tab shell and a test script in package.json.
   - Build, commit, push. Tell the user "contract is on main".
2. **Phase 1:** start five implementer subagents at once, each in its own worktree from fresh main.
   - **W1 data:** adapters, snapshots, products script, API skeletons returning normalized hourly data.
   - **W2 engine:** assess, wet bulb, sun, single-station mode, unit tests.
   - **W3 sim:** calibrate script, derive.ts, build-sim script and the committed week.json with beats.
   - **W4 UI:** all 2D components against mock frames, log store, CSV, playback bar reading a 48-frame fixture, demo panel and hotkeys.
   - **W7 3D:** the orchard map in `src/components/scene/` against the 48-frame fixture and the mock frame (section 12). Also pins the orchard block in `src/lib/site.ts` and writes `scripts/fetch-neighbors.ts` and `data/neighbors.geojson`.
   - Each subagent commits with `--no-verify`. As each finishes, start a review subagent on that branch's diff. The review looks only for demo-breaking bugs, contract drift and plan mismatches. Then merge per section 0.
3. **Phase 2, after W1, W2 and W3 are on main:** start two subagents.
   - **W5 forecast:** forecast.ts, wire `/api/now` and `/api/forecast` through derive.
   - **W6 wiring:** connect the UI and the 3D scene to the real endpoints and week.json, compute assessments live, log on status changes, beat markers, and the demo panel's hotkeys driving playback and the camera.
   - Review and merge as before.
4. **Phase 3, coordinator:**
   - Run the integration test.
   - Run `vercel link --yes`, then `vercel --prod`. There are no env vars.
   - curl both endpoints on the production URL.
   - Use Claude in Chrome to load the production page, play the sim to Beat A, and screenshot it.
   - Write the README demo script. Push.
5. **Services:** run `npm run dev` on port 3000 for local checks and stop it after. No other services.
6. **Cut order if behind:** the AZMet reading on the station card first (keep the card itself, using our 5 ft data), then the NWS overlay, then Beat E, then the storm's 3D cloud deck (keep its rain particles), then the forecast chart (keep the strip and next-window card). For 3D, cut in this order: neighbor buildings, the 2D/3D toggle, the inversion lid pulse, then drift particles (keep the wind particles). Never cut Beat A, the log, CSV, the deploy, or the 3D mast with wind at both heights. Feature freeze is 4:45 PM.

### 10b. Decisions already made by the user (2026-11-15, do not re-ask)
- Pushing reviewed pieces to main and running `vercel --prod` are pre-approved. Report each push and the production URL, but don't stop to ask.
- The 3D scene is also built in this run (W7, section 12). It uses MapLibre and deck.gl over satellite imagery, per the teammate's outline. Install maplibre-gl, react-map-gl, @deck.gl/core, @deck.gl/layers, @deck.gl/react and @deck.gl/mapbox in Phase 0. No three.js.
- The coordinator picks about six citrus active ingredients spanning low to high volatility, for example abamectin, spinetoram, imidacloprid, narrow-range oil, copper and a 2,4-D ester as the high-volatility example. Label limits are marked "check label".
- UI look: a dark control room. Dark background with glowing Go (green), Caution (amber) and Stop (red), built to read on a projector.
- Units are °F, mph and ft in the UI, with metric kept internally where the APIs give it.

- **Farm and blocks:** the W7 implementer traces them without asking. It views the Esri tiles near 32.61, -114.64 and records the 240-acre farm outline, every citrus block, the tower point and the default focused block in `src/lib/site.ts`, and saves a screenshot with the traced outlines to the notes folder as proof. All data pulls (calibration, sim week, snapshots) use the tower point, so W7 pins the site in its first step and the coordinator pushes `site.ts` to main before W1 and W3 fetch data. If W1 or W3 start first, they use 32.61, -114.64 and re-run their fetch scripts after the pin lands.
- **Hard stop at 4:15 PM (America/Phoenix, the event clock):** stop adding features, apply the cut order, and make sure the latest working main is deployed to production and checked. Check the clock between pieces.
- **Chrome checks:** Claude in Chrome may open its own tabs to load the production site, play Beats A and F, and save screenshots to the notes folder. Close those tabs when done, and never touch the user's existing tabs.
- **App title:** "Spray or Wait · by GitGrowing" in the header and page title.
- **Unsourced cutoffs** (gust, shear numbers, rain chance) stay in, labeled "heuristic, tunable" in the Why-these-limits panel.
- **Weak inversion:** under 1.8°F is CAUTION, and 1.8°F or more is STOP. High-volatility products STOP at any inversion.
- **Product list:** about five real citrus products, plus one real product with high vapor pressure (over 10 mPa by PubChem) used around orchards. It is labeled as the high-volatility example.
- **Sim week:** built from a recent real November week at the site, with a scripted winter frontal storm (Beat F) labeled "simulated storm".
- **Nothing in the demo may depend on something that can break:**
  - Commit the snapshots of every live source (Open-Meteo forecast, NWS, AZMet, neighbors).
  - Simulate mode needs no network at all: week.json, calibration and neighbors are committed.
  - Basemap: download the Esri World Imagery tiles covering the farm and its 3 km surroundings at zoom 13 to 17. Commit them under `public/tiles/` and point the map at them first, with the live Esri URL as a fallback. Keep the attribution. If the tile count exceeds about 400, drop zoom 17 outside the farm.
  - The demo runs from the Vercel URL, and `npm run build && npm run start` on the laptop is the backup.
  - Live mode falls back to snapshots silently, with a small "cached data" chip.
  - No external fonts or CDNs: fonts are self-hosted through next/font.

### 11. Decisions for the user (non-blocking)
- **Acreage:** not used. Drift risk depends on weather and product, not field size. Recommended: show the orchard's block outline in 3D only.
- **Product list:** label wind maxima are illustrative and flagged "check label" in the UI. Recommended: keep the flag and name real active ingredients.
- **Snapshots:** they're committed as offline demo fallbacks and generated today. Recommended: confirm with the organizers that this counts as data, not code.

### 12. 3D orchard map and extra views (W7 and W4, from the teammate outline)
Goal: an impressive, real-place 3D rendering of the current frame. The viewer sees the actual UA Yuma Mesa citrus block on satellite imagery, air layers colored by temperature, wind moving at different speeds and directions at each height, and spray drift that behaves differently under an inversion. It only renders frames and assessments; it never computes risk.

**Stack and setup:**
- react-map-gl (MapLibre flavor) with a deck.gl overlay in interleaved mode, plus @deck.gl/mesh-layers if spheres are needed.
- Loaded client-only through a dynamic import with server rendering off.
- **Basemap:** Esri World Imagery raster tiles (tile URL verified 200 on 2026-11-15, no key) with the required attribution. It's darkened and desaturated through raster paint properties for the control-room look. If tiles fail, draw a plain dark background and keep everything else.
- **Heights:** exaggerated 10x through one helper in `src/lib/scene/geometry.ts`, with a fixed "Heights x10" corner label. Trees, mast and air layers all use the same factor, so their proportions stay true.

**Camera:**
- On load, fly from a southwest-Arizona view to the whole farm: pitch about 55 degrees, all 240 acres in frame.
- Scroll-zoom and drag work anywhere. Clicking a block flies to it and makes it the focused block: the one being sprayed, with the status ring around it and drift coming from it. An "Overview" button and the F hotkey fly back out to the whole farm. A small block list in the overlay does the same as clicking.
- Slow auto-orbit when idle, stopping on any user drag.
- Presets: overview, side view (pitch about 75, looking across the mast so the stacked layers read as a column), top, and Overview (the whole farm). The 2D/3D toggle switches to top view and flattens extrusions, keeping the arrows and particles.

**Layers, bottom to top:**
1. **Farm and blocks:** the farm outline as a thin light path. Every block outline is faint. The focused block's outline glows in the current status color, with a faint fill. Hovering a block shows its name and acreage.
2. **Citrus trees:** generated on a row grid inside every block along its recorded bearing (about 6 m by 7 m spacing, about 23,000 trees for 240 acres, capped at 30,000), drawn as short dark-green columns about 4.5 m tall.
3. **Mast:** the farm's one weather tower, a thin column at the tower point up to 30 ft, with glowing sensor nodes at 5 ft and 30 ft colored by temperature. Text labels show each height's temperature, wind speed and direction.
4. **Air temperature layers:** one translucent horizontal slab per frame layer (5 to 260 ft) over the whole farm, padded about 150 m. Each is colored on a cool-blue to warm-orange ramp across that frame's range. Under an inversion this reads as warm air sitting over cool air.
5. **Inversion lid:** when the inversion is positive, a brighter sheet at the warmest layer at or below 100 ft, with an amber edge, pulsing gently when the status is STOP.
6. **Wind arrows:** at the mast for every layer. The 5 ft and 30 ft arrows are bold and the others faint. Length scales with speed and rotation follows direction, so shear shows as arrows pointing different ways.
7. **Wind particles:** advected each animation tick by that layer's wind and wrapped inside a box around the farm. Zoomed out, about 250 per layer spread across the farm. Zoomed in on a block, the same budget is respawned inside a box around the focused block, so density rises where the viewer is looking. They're drawn as short fading trails (a path per particle over its last few positions), so different speeds and directions at different heights are obvious at a glance.
8. **Drift particles:** emitted from the focused block's tree rows while the "spraying" toggle is on (on by default in Simulate). Behavior comes from a pure function of the frame and assessment:
   - Under an inversion, they cap below the lid height and spread sideways in a thin sheet downwind.
   - In GO conditions, they rise and fade quickly.
   - In high wind, they stream far downwind.
   - Particles reaching a neighbor footprint flash it red, labeled "drift path".
9. **Neighbors:** building footprints extruded dark gray, schools highlighted and county roads as lines, from `data/neighbors.geojson`.
   - `scripts/fetch-neighbors.ts` queries Overpass within 3 km, with the main server and one mirror.
   - Overpass returned "at capacity" on 2026-11-15, so the script writes a small hand-placed fallback set (a house cluster, a school, a county road) marked "illustrative" in the UI when both fail.
10. **Time of day:** the frame's sun elevation tints the scene darker and bluer at night. A time chip shows the frame's clock time.
11. **Storm:**
    - Rain particles fall as streaks whose count and speed scale with the rain rate, slanted by the 30 ft wind.
    - A dark translucent cloud deck sheet appears above the air layers as cloud cover rises.
    - The whole scene dims as the storm builds.
    - Gust pulses briefly lengthen the wind trails.
    - Drift particles shred fast downwind.
    - Optional, cut first: a brief lightning flash at peak.

**HTML overlay on the map:** status pill, frame time, the "Heights x10" label, a temperature color legend, and the Esri attribution.

**Animation:**
- One animation loop updates particle typed arrays and refreshes deck layers through update triggers, capped at about 30 updates a second.
- When playback moves to a new frame, temperatures and winds ease over about 300 ms, so speed-up-time looks fluid rather than jumpy.
- Particle seeds are fixed. Visuals need not be identical between runs, but status and log are.
- Budget: about 6,000 particles in total, plus up to 30,000 instanced trees. Check frame rate on the production URL in Chrome.

**Pure helpers in `src/lib/scene/`** (unit-tested):
- height to scene elevation
- wind speed and direction to a velocity vector
- lid height for a frame
- drift behavior for a frame and assessment (ceiling, sideways spread, rise rate)
- tree positions inside a polygon along a bearing
- one advection step

**Extra 2D views from the outline** (W4, all dark-themed):
- **MastSVG:** a two-height mast drawing with both temperatures and wind arrows. A warm-over-cool band appears on inverted frames.
- **TowerChart:** both heights' temperatures over time, with inverted periods shaded. The shading lines up with STOP frames.
- **WindChart:** speeds at both heights against shaded 3 mph and 10 mph bands.
- **WindCompass:** one arrow per height, so shear shows as arrows pulling apart.
- **LogTable:** highlights status-change rows, with a status filter.
- **WindowDial:** a 24-hour spray-window clock with the ring colored by each upcoming hour's status, next to the early-warning banner.
- **DemoPanel:** hidden by default and toggled with the backtick key, so it stays off the judges' view. Hotkeys:
  - 1 to 6 jump to Beats A to F
  - space pauses
  - [ and ] change speed (0.25, 1 and 6 sim-hours per second)
  - R clears the log
  - F flies to the whole-farm overview
  - V toggles 2D/3D
  - L switches Live and Simulate

**Layout of the Now tab:**
- The 3D map takes about 60% of the width on the left.
- The right column stacks the status card, droplet advice, station comparison, MastSVG and WindCompass.
- The playback bar runs full width at the bottom, with TowerChart and WindChart in a collapsible strip above it.

**Dropped from the outline:** the FastAPI back end, SQLite, server-sent events, the POST scenario and clock endpoints, and NAIP imagery. Our committed week.json with beats replaces the scenario injector, and the browser log replaces SQLite.

## A. Manual steps (for a human)
Preconditions: `npm install`, then `npm run dev` and open http://localhost:3000, or open the Vercel production URL.
1. **Now tab, Live:** the status card shows Go, Caution or Stop with at least one reason containing real numbers. The readings card shows 5 ft and 30 ft values. Pass: the values change slightly after about 60 s, and a log entry appears.
2. **Product:** switch to the high-volatility product. Pass: the status is the same or stricter, a reason mentions volatility, and the droplet advice card shows the same or a coarser class.
3. **Beat A:** click Simulate, then "next beat" until Beat A. Pass: the status is STOP with an inversion reason, the station comparison card says GO, and the 3D slot's text summary shows an inversion.
4. **Playback:** press play at 6 sim-hours per second. Pass: the status changes at least three times over the week and each change appears in the Log tab. Reload and replay. Pass: the same changes happen at the same sim times.
5. **Forecast tab:** pass if the 7-day strip is colored, a next-safe-window card shows a date and time range, and the early-warning banner appears or says none.
6. **CSV:** on the Log tab, Download CSV. Pass: it opens in a spreadsheet with one row per entry and the reasons in a single quoted cell.
7. **3D:** on load the map flies to the whole UA Yuma Mesa farm on satellite imagery, with trees in every block, the tower and the "Heights x10" label visible. Click a block. Pass: the camera flies to it, its outline glows in the status color, and the Overview button returns to the whole farm. Press 1 for Beat A. Pass: the warm slab sits over the cool one, the lid glows and pulses, drift particles flatten into a sideways sheet, and the 5 ft and 30 ft wind particles move at visibly different speeds. Press 3 or 4. Pass: the wind arrows and particle streams point different ways. Press 6 for the storm. Pass: the early-warning banner announces it ahead of time, rain streaks thicken, the cloud deck darkens the scene, wind trails lengthen, and status goes from GO through CAUTION to STOP with wind, gust and rain reasons. Press V. Pass: top-down view with arrows still showing. Pass overall if no visible stutter at 6 sim-hours per second.
8. **Demo panel:** press backtick. Pass: the panel appears and hides, and hotkeys work with it hidden.
9. **Offline:** open `/api/now?offline=1`. Pass: JSON whose source is marked as the snapshot.

Failure looks like a blank status, NaN in readings, a sim that differs between runs, or an empty log after playback.

## Testing

Integration (vitest, no live services):
- `tests/demo-scenario.test.ts` loads `public/sim/week.json` and runs the engine with the default product. At Beat F's peak frame, status is STOP with a rain reason and a gust reason, and the frames before it include a "storm approaching" CAUTION. At Beat A's frame, the full mode is STOP with an inversion reason and "no droplet size makes this safe", while single-station mode is GO. The week holds at least one GO window of 2 hours or more and at least three status changes. Rebuilding the sim from the script gives byte-identical output. Red before W2/W3 exist, green after Phase 2.
- Manual steps for Claude: curl `/api/now` and `/api/forecast` (live and offline=1) locally and on production. Chrome screenshot of Beat A on production.

Unit (keep to these; speed over coverage):
- `tests/engine.test.ts`:
  - inversion 2°F gives STOP and 1°F gives CAUTION
  - wind under 3 with an inversion gives STOP
  - wind over the label maximum gives STOP
  - direction shear is ignored in calm air
  - the droplet recommendation picks the finest GO class at or above the label minimum, and returns none when every class is STOP
  - a high-volatility product turns a 1°F inversion into STOP
  - single-station mode skips the inversion rule
  - rain over 0.1 in/hr gives STOP
  - gusts more than 10 mph over the maximum give STOP
  - a pressure fall of 2.0 hPa per hour gives a "storm approaching" CAUTION
  - Delta T of 11°C gives CAUTION and forces a Very Coarse or larger recommendation
  - every rule in thresholds.ts has a source with a kind and title (one test over the table, not per rule)
  - the worst status wins and reasons sort worst first
- `tests/wetbulb.test.ts`: Stull's formula matches a published value within 0.3°C (20°C at 50% RH is about 13.7°C wet bulb).
- `tests/forecast.test.ts`:
  - consecutive hours merge into windows
  - the next safe window needs at least 2 hours
  - the early warning picks the first worsening hour within 6 hours
- `tests/log.test.ts`: CSV quotes commas, quotes and newlines. The store falls back to memory when localStorage throws.
- `tests/derive.test.ts`: the 30 ft temperature lies between the 2 m and 80 m values, and layers are sorted by height.
- `tests/scene.test.ts`:
  - the 10x height helper maps 30 ft to the right elevation
  - a wind from the north produces a southward velocity
  - lid height is the warmest layer at or below 100 ft, and none when not inverted
  - the drift ceiling is below the lid under an inversion and unbounded in GO conditions
  - tree positions fall inside their block and the total stays under the 30,000 cap
- Coverage gap, accepted: no UI component tests and no API route tests beyond the manual curls.

## Coordinator decisions during the run (2026-11-15)
- Phase 0 is on main (commit 2b587f9). src/lib/contract.ts, thresholds.ts (SOURCES, T, RULE_DOCS), droplets.ts, site.ts (placeholder), products.ts (stub), mockFrame.ts, FrameProvider and the Scene3D placeholder exist. Builders conform to these names.
- Boundary rule: a value exactly at a cutoff gets the stricter status.
- Context fields: forecast-inversion-within-12h is SceneFrame.context.inversionForecastNext12h. Rain chance is SceneFrame.weather.rainProbNext2hPct.
- The forecast-inversion vapor caution is off in single-station mode.
- Beat A keeps cloud above 25%, so the timing hint does not push the single-station card off GO.
- The look-ahead status 3 hours ahead is computed at runtime (W6). Frames hold readings only.
- Tower heights are 5 ft and 30 ft everywhere.
