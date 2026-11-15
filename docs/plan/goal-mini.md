Resume the Spray or Wait build from Phase 1. Phase 0 is already on main (commit 2b587f9 or later). The notes live in the repo at docs/plan/: plan.md, goal-prompt.md, understanding.md, existing-structure.md, similar-patterns.md, and briefs/W1.md through W7.md (already written by Opus; don't rewrite them). Read goal-prompt.md and plan.md first, including the "Coordinator decisions during the run" section at the end of plan.md. Follow goal-prompt.md, with these substitutions: wherever it says /Users/natedemoro/notes/agx-spray-drift/, use <repo>/docs/plan/, and save screenshots to <repo>/docs/plan/screenshots/. Worktrees go in a sibling folder named Git_Growing-wt next to the repo.

GOAL: ship "Spray or Wait · by GitGrowing" (Next.js + TypeScript, UA Yuma Mesa citrus farm) to Vercel production, with:
1. NOW view: Go/Caution/Stop with source-tagged reasons, pesticide picker, droplet recommendation, single-station comparison, Why-these-limits panel.
2. Deterministic speed-up-time week, Beats A to F (A: station GO vs tower STOP inversion; F: severe storm).
3. Browser log with CSV export.
4. 7-day forecast windows, next safe window, early warning.
5. MapLibre + deck.gl 3D of the whole 240-acre farm: blocks, trees, one tower, temperature layers, inversion lid, wind and drift particles, storm effects, neighbors, click-to-focus, Overview.
6. Demo panel with hotkeys.
7. Simulate mode works with zero network; snapshots and tiles are committed.

DONE when:
- the production URL passes the plan's manual steps 1 to 9
- tests/demo-scenario.test.ts and the plan's unit tests pass
- Chrome screenshots of Beat A and Beat F on production are saved in docs/plan/screenshots/

RULES:
- You coordinate. Merges are yours; delegate building.
- Phase 1, in parallel: W1, W2, W3, W4, W7. Sonnet 5.5 builders, one worktree each. Merge W7's site.ts trace first.
- Phase 2: W5 and W6.
- Phase 3: deploy and checks.
- Every piece gets a Sonnet review, then a fix, then a merge to main and a push.
- Opus 5.5 is only for any new planning. No other models.
- Before building, check: npm install works, gh and vercel are logged in (vercel whoami), and Claude in Chrome is connected. If any login is missing, stop and ask.
- Pushes to main and vercel --prod are pre-approved.
- Hard stop at 4:15 PM America/Phoenix: apply the cut order and make sure the latest main is deployed and passes the Beat A check. Never cut Beat A, the log, CSV, the deploy, or the 3D tower with wind at both heights.
- Chrome: only in new tabs you create.
- Report one line per merge and the URL after each deploy, then a final summary.
- Stop and ask only for real blockers, quoting the exact error.
