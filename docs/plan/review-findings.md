# Review findings (2026-11-15, after first production deploy)

Three Sonnet reviewers looked at the shipped app at https://git-growing.vercel.app, each from a different angle: the applicator's decision flow, alerts and records, and a judge walking the live demo at projector size. Nothing here is built yet.

## Main finding
The app is good at saying whether to spray. It rarely says what to do instead. Its strongest argument for the tiebreaker, "the single station says GO, the tower says STOP", is buried below the fold.

## Bugs found
| Bug | Where | Fix |
|---|---|---|
| The Now tab shows an early warning ("CAUTION expected 4:00 PM") while the Forecast tab says "no early warning" for the same hours | EarlyWarningBanner vs ForecastPanel; two different look-ahead sources | Both tabs read one early-warning source |
| At 1280x720 the charts strip takes about 45% of the height, and the reasons list is cut off mid-sentence | Now tab layout | Charts collapsed by default, or a thin strip |
| The wind-direction legend is squeezed and runs off the right edge at 1280 wide | WindCompass | Put the text below the compass at narrow widths |
| The 5 ft and 30 ft map labels overlap, with white text on imagery and two elements under 11 px | scene Overlay and labels | Offset the labels, add a halo or chip background, set a minimum font size |
| First paint takes about 5.6 s with a blank-looking map | page load | Show a loading skeleton for the map and cards |

## Ranked additions
| # | Addition | What the user gets | Rubric | Effort | Risk |
|---|---|---|---|---|---|
| 1 | "Do this" line under the verdict | One sentence: spray now with these droplets, or wait until a time, or change nozzle. Also shown in the map pill. | Alerts, usefulness | ~45 min | Low |
| 2 | Station vs tower headline at the top | "Station: GO / Tower: STOP" directly under the verdict, with the next safe window on the same screen | Detection, presentation, tiebreaker | ~20 min | Low |
| 3 | Fit at 1280x720 | Verdict, station vs tower and the top reasons visible without scrolling | Presentation, execution | ~30 min | Medium |
| 4 | Fix the early-warning mismatch | The same warning on both tabs | Execution | ~20 min | Low |
| 5 | "What would make this GO" | The gap to the limit next to each reason, e.g. "Wind 11.4 mph, needs under 10" | Detection, alerts | ~1 h | Low (adds an optional field to the shared contract) |
| 6 | Start / Stop spraying record | Stamps block, product, droplet class, optional applicator, and conditions at start and stop. A "you are mid-application: STOP" banner. Flagged rows in the CSV. | Records, alerts | ~1-1.5 h | Low |
| 7 | Product comparison now | Each product's verdict and droplet class for the current conditions | Usefulness | ~30 min | Low |
| 8 | Status alerts | A beep and the status in the tab title when status worsens or turns GO, while the tab is open | Alerts | ~45 min | Medium (permission prompt on stage) |
| 9 | Countdown on Now | "Safe window opens in 3 h 20 min" or "GO for about 90 more minutes" | Alerts, usefulness | ~45 min | Low |
| 10 | Inversion end time | "Inversion expected to break around 8:00 AM" on STOP | Detection | ~1 h | Low |
| 11 | Block-order advice | Blocks ranked by where their drift goes | Usefulness | 1.5 h+ | Medium (no real neighbor data; label it "drift heading") |
| 12 | Printable record | One page per spray session, through the browser's print dialog | Records | ~1 h | Low |
| 13 | Header explainer | A one-line explainer in the top bar, and "Simulated tower" on the SIM chip | Presentation | ~15 min | Low |
| 14 | Extra CSV columns | Inversion yes/no, block, event type, the label wind limit, and a plain-language justification | Records | ~30 min | Low |

Recommended order: 1-4 together as one Now-tab change, then 6, then 5.

## Cautions
- Records should say "supports label recordkeeping". Do not claim regulatory compliance. The user confirms the actual label and the Arizona Department of Agriculture rules.
- Alerts are in-tab only. SMS, push and a server-side log are out of scope (plan section 8).
- There are no real neighbor or school locations, so any block or buffer advice is about drift heading only. A buffer distance would be an unsourced heuristic.
- Beat A happens at 6:15 PM, just after sunset. The copy could say the inversion forms after sunset, and that a ground station can't see it.

## Visuals
A fourth Sonnet reviewer looked at the visuals, working from production screenshots. Its file paths are unverified.

Main finding: the 3D scene is rich, but at projector distance a viewer can't tell which layer is which height, can't see where spray would go, and can't see why the status changed.

### Fixes to the current visuals
| # | Problem | Fix | Rubric | Effort | Risk |
|---|---|---|---|---|---|
| V1 | The 5 ft and 30 ft tower labels collide and get cut off (Beats C, D, F) | Offset the labels, prefix "5 ft" and "30 ft", larger font on a solid background | Presentation | S | Low |
| V2 | The temperature legend rescales every beat, so orange means different things | A fixed range (e.g. 60-100°F) or the label "relative to this hour", plus a "warm over cool" caption on inversion beats | Presentation, detection | S | Low |
| V3 | Nothing says which slab is 5 ft or 30 ft | Height labels at the slab edges ("5 ft", "30 ft", "lid") and a wind-particle color key | Presentation | S | Low |
| V4 | The map's status pill truncates its reason ("inv...") | A short reason instead, e.g. "Inversion +3°F" or "Wind 18 mph" | Presentation | S | Low |
| V5 | Drift under GO and under STOP look alike in wide shots | Fade the wind particles while drift shows, use thicker and brighter drift trails, frame the camera so the drift path is visible | Detection | M | Medium |
| V6 | Beats C and F are framed too wide; Beat C reads as a wall of streaks | Lower particle density when wind is the cause, and a tighter camera per beat so one element carries each beat | Presentation | S | Low |
| V7 | The storm build-up and night look like an ordinary day | Darken and tint at night, a thicker cloud deck and rain before the peak, and a "storm in 2 h" chip on the map | Presentation | M | Medium |
| V8 | At 1600x1000 the charts hide the readings rows; chart labels are crowded | Charts collapsed by default, or a scrolling right column (same as addition 3) | Execution | S | Low |

### New visuals that help the decision
| # | Visual | What it tells the user | Rubric | Effort | Risk |
|---|---|---|---|---|---|
| N1 | Drift footprint on the ground: a plume shape downwind of the focused block that stretches under inversion and low wind, red where it reaches a neighbor | "If I spray Block E now, where does it land?" | Detection, usefulness | M | Medium |
| N2 | A 12-hour GO/CAUTION/STOP ribbon under the map, with a "now" marker, sunrise and sunset ticks, and the next GO window labeled | "Wait until 9:30 AM" without leaving the Now tab | Alerts, usefulness | M | Low |
| N3 | Tower vs single station on the map: when they disagree, a callout of what a 5 ft station alone would say beside the tower verdict | The tiebreaker, visible in the 3D view itself | Tiebreaker, detection | S-M | Low |
| N4 | A vertical temperature profile at the tower: a slanted line showing warm over cool | The inversion at a glance (check overlap with MastSVG first) | Detection, presentation | S | Low |
| N5 | "What changed" banner for 3 s when status flips, e.g. "GO to STOP: inversion formed (+3.0°F)", with the changed readings highlighted | Why the call changed | Alerts, presentation | M | Low |
| N6 | Each block tinted by whether its drift heads toward a neighbor | Which blocks are safe to spray now | Usefulness | M | Medium (neighbors are illustrative) |
| N7 | A sun arc with the inversion-risk hours shaded around sunset and sunrise | Why dusk and dawn are the danger hours (WindowDial may already cover this) | Presentation | S | Low |

The reviewer's top three: N1 drift footprint, N2 12-hour ribbon, N3 tower vs station on the map. V1 and V2 are cheap and worth doing alongside them. It suggested skipping a wind rose, since WindCompass already shows the same thing.

Overlaps with the additions above: N2 covers addition 9 (the countdown). N3 is the 3D side of addition 2. V8 is addition 3.
