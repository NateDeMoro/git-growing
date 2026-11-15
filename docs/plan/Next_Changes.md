# Next changes

Backlog for the next /goal run. Every change we agree to add goes here first. Background, evidence and screenshots for each item are in review-findings.md in this folder.

## Target screen
We present on the user's 15-inch MacBook Air, not a projector. As the user has it set, the screen is about 1900 x 1200. That leaves roughly 1900 x 1080 for the page in a normal Chrome window, after the menu bar, tabs and address bar, and about 1900 x 1200 in full screen. At the start of the run, ask the user for the exact page size: they open the site and read `window.innerWidth` and `window.innerHeight` in the console. Then use those numbers. Every layout change must fit at the windowed size with nothing important below the fold, and still look right in full screen. Check both sizes with screenshots before merging.

## Approved

### 1. "Do this" line under the verdict
One plain sentence under GO, CAUTION or STOP that tells the applicator what to do now. Examples:
- On GO: spray now with Medium droplets, and stop if the wind passes 8 mph.
- On STOP: don't spray; the inversion is 3°F; the next safe window starts Monday 9:30 AM.
- On CAUTION: hold, or switch to Coarse or larger droplets.

It is built from what the engine and forecast already compute: the recommended droplet class, the next safe window and the early warning. In Simulate it uses the sim week's look-ahead; in Live it uses the forecast. It shows in the right column only, not on the 3D map (see item 8). It gets a unit test covering Beats A, B and F.

### 2. (Dropped) Station vs tower headline
Replaced by item 6. We don't compare against a single station. The tower's own 5 ft and 30 ft readings make the "better than one station" case.

### 3. Fit the MacBook Air screen
At the windowed page size (about 1900 x 1080) the whole Now tab fits without scrolling:
- the map on the left, about 60% of the width
- the right column in item 6's order
- the pesticide selector along the bottom

Overlong reasons wrap, not clip. If the readings don't fit, they are the part allowed to scroll inside the right column. Save screenshots at the windowed and full-screen sizes for Beats A and F as proof.

### 6. Simplify the Now tab
Remove:
- the Tower vs Single Station card, including the AZMet regional station box on it
- the mast drawing (MastSVG)
- the wind direction compass (WindCompass)
- the charts strip at the bottom: the temperature and wind charts over the last 24 hours
- every other card in the right column not listed below

The right column becomes, top to bottom:
1. **Verdict bar:** GO, CAUTION or STOP, with its top reason. The "Do this" line from item 1 sits inside it.
2. **Reasons:** the full list, worst first, each with its source tag.
3. **Safe droplet sizes:** the droplet classes that are safe right now, with the recommended class marked.
4. **Readings:** 5 ft and 30 ft side by side, plus the derived values (inversion, wind difference, Delta T, humidity, gusts, rain, cloud, pressure).

The pesticide selector moves out of the right column into a bar along the bottom of the screen, where the charts were. The playback controls stay at the bottom too.

Follow-on changes:
- **Station data:** the AZMet regional reading and the `/api/station` route are no longer shown. The route can stay, or be removed if nothing else uses it.
- **Manual step 3:** it changes to "Beat A shows STOP with an inversion reason, and the 5 ft and 30 ft readings show 30 ft warmer". It no longer checks a station card.
- **Unused code:** the single-station engine mode stays in the engine and tests, but is no longer shown in the UI.
- **Removed components:** delete the removed components and their imports. Don't leave dead files.
- **README:** update the demo script so Beat A is told through the 5 ft vs 30 ft readings.

Item 7 turns the safe droplet sizes card into a nozzle card.

### 7. Recommend a nozzle, not just a droplet size
A farmer doesn't pick a droplet class; they pick a nozzle. The app should tell them which nozzle type and size to fit, with the droplet class behind it as the reason.

**Research first** (open each source; don't rely on memory):
- **ISO 10625**, the international standard for sprayer nozzle color coding. It ties each nozzle size to a color by flow rate, e.g. orange, green, yellow, blue, red. Confirm what it covers and what it doesn't. We believe it sets the size and color but not the droplet size, so check that.
- **Droplet class link:** how a nozzle type, size and pressure map to an ANSI/ASABE S572.3 droplet class. This mapping comes from the manufacturers' published charts (e.g. TeeJet, Hypro, Lechler, Albuz), not from ISO 10625.
- **Citrus sprayers:** citrus is usually sprayed with airblast sprayers. Find the nozzle types used on them (e.g. hollow-cone disc-and-core nozzles, ceramic hollow cones such as Albuz ATR, air-induction hollow cones) and whether ISO 10625 colors apply to them.
- **Extension guidance:** University of Arizona, UC ANR or other airblast nozzle-selection guides for orchards.

**What the user sees.** The card says what to fit. For example:
- "Fit air-induction hollow-cone nozzles, ISO yellow (02) or larger, at 75 psi or below. This gives Coarse droplets, the finest class that is safe right now."
- On STOP for an inversion: "No nozzle makes this safe. Wait."

It also gives a one-line "why": coarser droplets drift less, but cover the leaf less evenly.

**Data.** A small committed table maps each droplet class to nozzle choices: nozzle type, ISO 10625 size and color, and a pressure range. Each row cites the manufacturer chart or guide it came from. The engine's droplet recommendation stays as is; the nozzle card reads from it, and so do the log and CSV.
- **CSV:** add a nozzle column next to droplet.
- **Why-these-limits list and README:** add ISO 10625 and the chart sources.

**Honesty.** Nozzle output depends on pressure, speed and the specific product. Label the advice "starting point; confirm with your nozzle chart and the product label". If no published chart can be found for a class, show only the droplet class for that row.

### 8. 3D view: compass, cleaner tower, turn left and right
- **Compass.** A compass in a corner of the 3D map shows where north is. Its needle turns as the view turns, and clicking it turns the view back to north-up.
- **Remove the white arrows at the tower.** These are the bold white arrows drawn at the mast. In the code they are the wind arrows for each height, not rain; confirm on screen which arrows the user means before removing anything. Keep the text labels with temperature and wind speed (and direction) at 5 ft and 30 ft. The colored wind particles across the farm stay, so the wind is still visible.
- **Make the tower easier to see.** Thicker and brighter mast, larger sensor dots at 5 ft and 30 ft, and labels on a solid background so they don't collide or sit on busy imagery. It must stand out from the trees and the temperature layers in every beat, day and night.
- **Turn the view left and right.**
  - **Buttons:** on-screen rotate-left and rotate-right buttons near the compass, each turning about 15° per click.
  - **Keys:** the left and right arrow keys do the same. Add them to the demo panel's hotkey list, and check they don't clash with existing keys.
  - **Mouse:** dragging with the right mouse button (or Ctrl-drag) turns the view, as MapLibre allows. Two-finger rotate on the trackpad works too.
  - **Auto-orbit:** turning by hand stops the slow idle spin. Overview (F) brings back the default heading.
- **Status pill shows only the verdict.** The pill in the 3D map's top-left corner shows just GO, CAUTION or STOP in its status color, with no reason text. The reasons live in the right column. This replaces review item V4.
- **Remove the illustrative neighbors.**
  - **What goes:** the hand-placed neighbor buildings, school and road from the 3D map, and the "illustrative neighbors" chip in the top-left.
  - **Why:** they were placeholders because the public map servers were down. Showing nothing is more honest than showing made-up buildings.
  - **Side effect:** the "drift path" red flash, where drift particles reach a neighbor, goes too. Drift particles still show their spread under an inversion and in high wind.
  - **Data and script:** delete `data/neighbors.geojson` and `public/data/neighbors.geojson`. Keep `scripts/fetch-neighbors.ts` only if real neighbor data might be added later; otherwise delete it too.
  - **Docs:** remove neighbors from the README and from review candidates N1 and N6, which relied on them.
- **Remove the height planes.** The translucent blue-to-orange temperature layers drawn over the whole farm at each height, and the amber inversion lid sheet, are removed.
  - **Also remove:** the temperature color legend in the bottom-right, which only explained those planes.
  - **Kept, so the inversion still shows in 3D:** the 5 ft and 30 ft temperature labels on the tower, and the drift particles flattening into a sideways sheet under an inversion.
  - **Optional:** the tower's sensor dots can stay colored cool or warm to hint at the inversion.
  - **Manual step 7 changes:** Beat A no longer checks for "the warm slab sits over the cool one and the lid glows". Instead it checks that the 30 ft label reads warmer than 5 ft and that drift flattens.
  - **Dropped candidates:** V2 (the fixed legend) and V3 (layer height labels).
  - **Requirement change:** the original goal listed "temperature layers" and "inversion lid" for the 3D view. This change removes them by the user's decision, 2026-11-15.
- **Remove the spray drift animation entirely** (user decision, 2026-11-15). The drift particles from the focused block are gone. The inversion now shows only through the tower's 5 ft and 30 ft labels and the right column. Wind particles stay.
- **Remove the "Spraying" toggle.** This is the checkbox in the 3D map's top-right corner, which turns the drift particles on and off. With it gone, drift particles always show from the focused block, in Live and Simulate. Drift is a required part of the 3D view, so the particles stay; only the switch goes.

### 9. Forecast tab
- Remove the "Next 24 hours" clock (WindowDial).
- The temperature chart shows only the 5 ft and 30 ft temperatures. The NWS mixing height line and its second axis go.
- Add a "Tower" dropdown to the temperature chart. Only one tower exists today, but it's real selectable state, to show a farm with several towers could switch between them.

### 10. Make CAUTION say what to do
CAUTION covers about ten different situations, and the current action line ("Hold, or switch to coarser droplets") is unclear. Every CAUTION becomes one of two kinds, picked from the reason that caused it:
- **Spray with care: "OK to spray if…"** plus the condition.
  - Dry air (Delta T 10–12 °C): only with Very Coarse nozzles.
  - Wind within 2 mph of the limit: watch the wind and stop at the limit.
  - Inversion likely forming: finish the current block, don't start a new one.
  - Rain likely within 2 hours: only if the label's rainfast time is shorter than the time until rain.
  - Storm approaching: finish within the hours before it arrives.
- **Wait: "Wait until…"** plus a forecast time where known.
  - Gusts over the limit.
  - Too calm with no inversion.
  - Weak inversion.
  - Light rain.

If several CAUTION reasons fire at once, any "wait" reason wins. The verdict bar shows the kind under the word CAUTION ("Spray with care" or "Wait") and the action line in large type. The 3D map pill stays verdict-only (item 8). Covered by unit tests.

Not decided yet (confirm before the run):
- Where the "Why these limits" panel goes. It was a requirement in the original goal; options are a link that opens it, or moving it to its own tab.
- Whether the early-warning banner (e.g. "Storm arriving in 2 hours") stays on the Now tab. It stays on the Forecast tab either way.

### 4. One early warning on both tabs
The Now tab and the Forecast tab currently disagree: Now shows "CAUTION expected 4:00 PM" while Forecast says there is no early warning. Both tabs must read the same early-warning source, so they always agree. Add one unit-level check that the two agree for the same hour.

### 5. More sources behind our limits
Look for published sources to back the cutoffs that are still our own choice. In the app these currently show the tag "Our choice (tunable)", which a judge sees on almost every wind reason. The research step runs first, the code change after.

Rules with no published source yet:
- **Gusts:** CAUTION above the label maximum, STOP at 10 mph or more over it.
- **Wind speed difference between 5 ft and 30 ft:** CAUTION at 5 mph, STOP at 10 mph. The track brief backs flagging it at all, but not these numbers.
- **Wind direction difference between heights:** CAUTION at 45°, STOP at 90°, only when both speeds are at least 2 mph. Same situation as speed difference.
- **Near the wind limit:** CAUTION within 2 mph of the label maximum.
- **Rain chance:** CAUTION when the chance of rain is over 50% in the next 2 hours.
- **The GO message:** "all within limits" is currently tagged as our choice. It should cite the rules it summarizes instead.

Where to look:
- Product labels with drift-reduction language, such as the Enlist and dicamba labels, which spell out wind, gust and inversion terms.
- EPA drift-reduction guidance and the DRT program.
- University extension spray-drift guides, for example UC ANR, the University of Arizona, Nebraska, NDSU and Purdue.
- The ASABE standards.
- The Arizona Department of Agriculture's pesticide rules.
- Australian guidance, such as GRDC and APVMA.

For each rule:
- **If a source is found:** record its title and link, and change its kind to guidance or standard.
- **If a source points to a different number:** adjust the cutoff, and re-check that Beats A to F still land on the same statuses.
- **If nothing is found:** keep it tagged as our choice.

Every source is checked by opening it, not taken from memory. The "Why these limits" panel and the README source list are updated to match. Tests and the demo-scenario test must still pass.

## Candidates (not approved yet)
Discuss before adding to Approved. Numbers match review-findings.md.
- Additions 5-14: what-would-make-this-GO, start/stop spray record, product comparison, status alerts, countdown, inversion end time, block-order advice, printable record, header explainer, extra CSV columns.
- Visual fixes V1-V8: tower labels, fixed legend, layer height labels, status pill text, drift visibility, beat framing, storm and night drama, charts covering readings.
- New visuals N1-N7: drift footprint, 12-hour ribbon, station vs tower callout on the map, tower profile, "what changed" banner, block safety tint, sun arc.

## Rules for the run
Same process as the first run: Sonnet builders in worktrees, a Sonnet review on each piece, then a fix, merge, push and production deploy. Re-run the full test suite and manual steps 1-9 after the changes, using the updated step 3 from item 6. Don't break Beat A, the log, CSV, or the 3D tower with wind at both heights.
