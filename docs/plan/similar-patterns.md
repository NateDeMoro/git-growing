---
issue: n/a
kind: feature
opener: user (verbal)
related_issues: []
related_prs: []
status: introduced
last_updated: 2026-11-15
---

# Similar patterns

## 1. Pattern catalogue
- Battany inversion tower (GiESCO 2017, UCCE): two loggers, 1.5 m and 10.7 m, 5-minute readings, plot both lines on one chart. Template for our sensor model, the 1.0 C threshold, and a "two lines on one chart" log view.
- UC ANR Airblast Spray Advisor (ucanr.edu/site/airblast-spray-advisor): an existing orchard spray-conditions tool. Not readable from this session (fetch blocked); treat as the competitor to position against ("single station vs two heights").
- Spray-window tools using Delta T (dry bulb minus wet bulb; 2-8 C commonly cited as the good range, above 10 C avoid, below 2 C caution for inversion and fine-droplet survival): template for the evaporation rule and the forecast "spray window" strip.

## 2. No-precedent notes
Greenfield repo; no in-codebase precedent for anything. The frame contract with the 3D teammate is new and is the main coordination risk.

## 3. Reusable helpers and fixtures
None in repo. Live API responses verified on 2026-11-15 (see existing-structure.md) become committed JSON snapshots that double as offline demo fallbacks and test fixtures.

******
2026-11-15: teammate outline "Spray or Wait Functional Plan". Templates adopted: a two-height mast SVG with a warm-over-cool band; a single-station vs two-height side-by-side; a temperature chart with crossings shaded; a wind chart against the 3 and 10 mph bands, plus a compass; a 24-hour spray-window dial; and a hidden demo panel with hotkeys. Avoided: the FastAPI/SQLite/SSE back end (Vercel serverless has no persistent disk) and recomputing status anywhere except the engine.
