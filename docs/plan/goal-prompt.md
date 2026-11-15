Implement the hackathon app described in /Users/natedemoro/notes/agx-spray-drift/plan.md, end to end and fully autonomously. Read the whole plan first, along with understanding.md, existing-structure.md and similar-patterns.md in the same folder. The plan is the source of truth. Section 10b and the decisions list are already answered, so do not re-ask them.

GOAL
Ship "Spray or Wait · by GitGrowing" to Vercel production. It is a Next.js + TypeScript app for the AgX HackDay pesticide-drift track, set at the UA Yuma Mesa citrus farm. It must have:
1. A NOW view: Go/Caution/Stop with plain-language, source-tagged reasons, from simulated 5 ft and 30 ft tower readings plus real weather data. The only user input is the pesticide picker. A recommended droplet class is shown. Single-station comparison. A "Why these limits" panel.
2. Speed-up-time playback of the committed, deterministic simulated week with Beats A to F. Beat A: the ground station says GO while the tower says STOP from an inversion. Beat F: a severe storm.
3. A time-stamped log stored in the browser, with CSV export.
4. A 7-day forecast of safe and dangerous spray windows, the next safe window, and an early warning.
5. A 3D view with MapLibre and deck.gl on satellite imagery: the whole 240-acre farm, every citrus block traced, about 23,000 trees, one weather tower, temperature layers, inversion lid, wind particles at each height, drift particles, rain and storm effects, neighbors, click-to-focus a block, and the Overview button.
6. A demo panel with hotkeys 1 to 6, space, [ ], R, F, V and L.
7. Simulate mode works with zero network. Every live source has a committed snapshot fallback, and satellite tiles are committed under public/tiles.

DONE when the production Vercel URL passes manual steps 1 to 9 in the plan, the integration test tests/demo-scenario.test.ts and the unit tests pass, and Chrome screenshots of Beat A and Beat F on production are saved to /Users/natedemoro/notes/agx-spray-drift/screenshots/.

HOW TO WORK
- You are the coordinator. Do not write feature code yourself, except Phase 0 and merge or conflict fixes. Delegate everything else to subagents.
- Model rules for subagents:
  - Planning subagents run on Opus 5.5 (model: opus). For each piece (W1 to W7), before building, one Opus subagent turns that piece's section of plan.md into a short, ordered task brief. The brief names the files to create, the contract fields used, the tests to write, and the risks. Write it to /Users/natedemoro/notes/agx-spray-drift/briefs/<piece>.md. Run the planning subagents for a phase in parallel.
  - Building and reviewing subagents run on Sonnet 5.5 (model: sonnet). Each builder gets its piece's brief plus the relevant plan sections, and works only in its own worktree.
  - Do not use any other model.
- Phase 0, done by you on main:
  - Scaffold with create-next-app: TypeScript, App Router, src dir, Tailwind, ESLint.
  - Install vitest, recharts, suncalc, maplibre-gl, react-map-gl, @deck.gl/core, @deck.gl/layers, @deck.gl/react, @deck.gl/mapbox and @deck.gl/mesh-layers.
  - Write src/lib/contract.ts, site.ts (placeholder center 32.61, -114.64), thresholds.ts (every rule with its source record from the plan), droplets.ts and a products.ts stub.
  - Add the FrameProvider with a mock frame, a Scene3D placeholder, the dark tab shell titled "Spray or Wait · by GitGrowing", and a test script.
  - Run npm run build and npm test, commit and push to main.
- Phase 1, in parallel: give W1 data, W2 engine, W3 sim and calibration, W4 2D UI and W7 3D each their own git worktree under /Users/natedemoro/Code/Git_Growing-wt/<piece>, on a branch piece/<name> cut from the latest main.
  - W7's first task is to trace the farm, blocks and tower point into site.ts and save a screenshot. Merge that commit to main right away, then have W1 and W3 re-run their fetch scripts against the pinned tower point.
- Phase 2, in parallel, after W1, W2 and W3 are merged: W5 forecast and W6 wiring.
- Phase 3, done by you:
  - Run the integration test.
  - Run vercel link --yes, then vercel --prod. Pushing to main and production deploys are pre-approved.
  - curl /api/now, /api/forecast and /api/station, each live and with offline=1.
  - Chrome checks on production.
  - Write the README with the run steps, the data sources, what is simulated, and the demo script.
- After each builder finishes:
  - Immediately start a Sonnet review subagent on that branch's diff against the brief and plan. It looks only for demo-breaking bugs, contract drift, unsourced thresholds and plan mismatches, and returns a short findings list.
  - While it reviews, keep coordinating other pieces.
  - Then have a Sonnet builder apply the real findings in the same worktree.
  - Then: git pull on main, rebase the branch, npm install, npm run build, npm test for the piece's test files, fast-forward main, push, and remove the worktree.
  - Lockfile conflicts: take main's lockfile, re-run npm install, commit.
- Builders commit with --no-verify and end every commit message with the attribution lines from your system reminder.
- Contract rule: src/lib/contract.ts fields can only be added, never renamed or removed. Builders that need a new field tell you, and you add it on main.
- Tests stay minimal: only the integration test and the unit tests listed in the plan. Speed and demo quality beat coverage and architecture.
- Run long commands (npm install, builds, tests, deploys) in the background, and keep coordinating while they run.

CLOCK
- Event clock is America/Phoenix. Check the time between pieces.
- At 4:15 PM, stop starting new work and apply the plan's cut order. Make sure the latest working main is deployed to production and passes the Beat A check.
- Never cut Beat A, the log, CSV, the deploy, or the 3D tower with wind at both heights.

CHROME
- Use Claude in Chrome only in new tabs you create, and close them when done. Never touch existing tabs.
- On production: load the site, check the 3D farm renders, press 1 (Beat A) and 6 (Beat F), and screenshot each.
- If Chrome is unreachable, say so and continue with curl checks.

REPORTING
- After every merge, post one line: piece, what landed, the commit hash, and whether the build and tests are green.
- After every deploy, post the production URL.
- At the end, give a short summary with:
  - the production URL
  - which plan items shipped and which were cut
  - test results
  - screenshot paths
  - anything simulated or heuristic that the presenter should mention
- If something truly blocks you, such as a missing permission, an expired login, or an API that is down with no snapshot, stop and ask with the exact error. Otherwise make reasonable calls, follow the plan, and keep going.
