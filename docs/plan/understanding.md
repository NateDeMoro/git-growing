---
issue: n/a
kind: feature
opener: user (verbal)
related_issues: []
related_prs: []
status: introduced
last_updated: 2026-11-15
---

# Understanding: AgX spray-drift data and forecasting

## Source request (verbatim, user, 2026-11-15)
"Plan the data and forecasting pieces (everything except the 3D visual) for the AgX HackDay pesticide drift track: NOW piece (sensor readings at 5ft/35ft + other data, pesticide volatility, Go/Caution/Stop with reasons, time-stamped log) and FORECAST piece (next-week safe/dangerous spray windows from forecast data). Use real data sources where possible (Open-Meteo forecast + historical, NWS gridpoint, PubChem, AZMet), synthesize the rest. Hackathon: ~5hr prototype, speed and demo over accuracy and architecture; minimal tests. Host on Vercel. Teammate plans the 3D component separately."

Follow-up, same day: implementation runs fully autonomously via /goal with parallel subagents in separate worktrees, pushing each piece straight to main after a subagent review. Add a "speed up time" button that plays a precomputed, deterministic week-long simulation so the visual visibly changes and the status flips (for example, wind shifts and the tool says STOP). Include pesticide droplet size as an input.

Earlier decisions: Next.js + TypeScript; forecast = rules engine on forecast hours plus a historical calibration; log in browser storage with CSV export; keep all data sources found (not only sensor-measurable ones).

## Goal and kind (Q1)
Feature, greenfield. An applicator opens the site and sees: is it safe to spray right now and why (from two-height tower readings plus product and droplet settings), a time-stamped log, a sped-up week simulation, and a 7-day forecast of safe and dangerous spray windows.

## Surface (Q2)
Empty repo at /Users/natedemoro/Code/Git_Growing (README.md, .gitignore only, commit ca07c26). Everything is new: a Next.js app with API routes, a pure risk engine, data adapters, a simulation generator, a forecast module, and non-3D UI. The 3D view is a teammate's component that plugs into a contract this plan defines.

## Current vs desired behaviour (Q3)
Today: nothing. After: deployed Vercel site with NOW panel, speed-up-time playback, log with CSV export, forecast timeline, and a slot where the 3D scene renders from the same per-frame data.

## Who and why now (Q4)
Users: orchard applicators and PCAs (track text: California Central Valley; our site: a Yuma, Arizona citrus orchard). Judges: AgX HackDay, Nov 15 2026; judging starts 5:30 PM, freeze 4:45 PM. Rubric (20 pts): drift-risk detection 5, actionable alerts and records 3, real-world usefulness 3, execution 4, presentation 5; tiebreaker "how much better than a single weather station" (multi-height data, predicting safe windows, creativity).

## Done criterion (Q5)
On the deployed site: (1) the demo scenario shows a single ground-level station reading "looks fine" while the tool shows STOP with a plain-language reason (inversion); (2) pressing speed-up-time plays the same week every time with status changes and log entries appearing; (3) the forecast lists the next safe window; (4) the log exports as CSV; (5) the 3D teammate can render from the shared frame contract.

## Open questions
- Location fixed: Yuma citrus orchard (user, 2026-11-15). Droplet size is a recommendation, not an input; pesticide is the only user input.
- Whether pre-downloaded data counts as allowed (organizers). Plan commits fetched snapshots only as offline fallbacks, generated at event time.

******
2026-11-15 update: the 3D scene is now built in this run (the teammate's outline, "Spray or Wait Functional Plan", was folded in). It uses MapLibre and deck.gl on Esri imagery at the UA Yuma Mesa Farm, with a 10x height exaggeration. Its FastAPI, SQLite and SSE back end is dropped. The upper sensor is now 30 ft, to match the track. Beat F is a severe storm in the simulated week (wind, gusts and rain building to STOP).
