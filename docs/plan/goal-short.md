Implement /Users/natedemoro/notes/agx-spray-drift/plan.md end to end, fully autonomously. Follow the detailed run instructions in /Users/natedemoro/notes/agx-spray-drift/goal-prompt.md exactly. Read it and the four notes files (plan.md, understanding.md, existing-structure.md, similar-patterns.md) first. The plan is the source of truth. Its decisions are already answered, so don't re-ask them.

GOAL: ship "Spray or Wait · by GitGrowing" (Next.js + TypeScript, UA Yuma Mesa citrus farm) to Vercel production, with:
1. NOW view: Go/Caution/Stop with source-tagged reasons, pesticide picker as the only input, droplet recommendation, single-station comparison, and a Why-these-limits panel.
2. Deterministic speed-up-time week with Beats A to F (A: station GO vs tower STOP from an inversion; F: severe storm).
3. Browser log with CSV export.
4. 7-day forecast windows, next safe window, and early warning.
5. MapLibre + deck.gl 3D of the whole 240-acre farm: blocks, trees, one tower, temperature layers, inversion lid, wind and drift particles, storm effects, neighbors, click-to-focus, Overview.
6. Demo panel with hotkeys.
7. Simulate mode works with zero network; snapshots and tiles are committed.

DONE when:
- the production URL passes the plan's manual steps 1 to 9
- tests/demo-scenario.test.ts and the plan's unit tests pass
- Chrome screenshots of Beat A and Beat F on production are saved in /Users/natedemoro/notes/agx-spray-drift/screenshots/

RULES:
- You coordinate. Do Phase 0 and merges yourself; delegate the rest.
- Opus 5.5 subagents write per-piece briefs into briefs/.
- Sonnet 5.5 subagents build and review, one git worktree per piece under /Users/natedemoro/Code/Git_Growing-wt/. Each piece is reviewed, then fixed, then merged to main and pushed. No other models.
- Pushes to main and vercel --prod are pre-approved.
- Hard stop at 4:15 PM America/Phoenix: apply the cut order and make sure the latest main is deployed and passes the Beat A check. Never cut Beat A, the log, CSV, the deploy, or the 3D tower with wind at both heights.
- Chrome: only in new tabs you create.
- Report one line per merge and the URL after each deploy, then a final summary.
- Stop and ask only for real blockers, quoting the exact error.
