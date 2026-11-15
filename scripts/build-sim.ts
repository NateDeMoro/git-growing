// Writes public/sim/week.json and tests/fixtures/frames48.json. Run: npm run build-sim [-- --refresh | --check]
// --refresh re-pulls the week from Open-Meteo into data/snapshots/; --check rebuilds in memory and compares to the committed bytes.
import fs from "node:fs";
import path from "node:path";
import { SITE } from "../src/lib/site";
import { pullHourly } from "./lib-openmeteo";
import { SNAPSHOT_PATH, WEEK_START, buildSim, type Snapshot } from "./sim-core";

const ROOT = path.resolve(__dirname, "..");
const WEEK_PATH = path.join(ROOT, "public", "sim", "week.json");
const FIXTURE_PATH = path.join(ROOT, "tests", "fixtures", "frames48.json");

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--refresh")) {
    const recs = await pullHourly(SITE.tower.lat, SITE.tower.lon, WEEK_START, "2026-11-01", path.join(ROOT, "data", "raw"));
    const records = recs.slice(0, 169);
    if (records.length !== 169) throw new Error(`expected 169 hourly records, got ${records.length}`);
    const snap: Snapshot = { lat: SITE.tower.lat, lon: SITE.tower.lon, start: WEEK_START, records };
    fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snap) + "\n");
  }
  const { weekJson, fixtureJson } = buildSim();
  if (args.includes("--check")) {
    const same = fs.readFileSync(WEEK_PATH, "utf8") === weekJson + "\n" && fs.readFileSync(FIXTURE_PATH, "utf8") === fixtureJson + "\n";
    console.log(same ? "build-sim check: identical" : "build-sim check: DIFFERENT");
    process.exit(same ? 0 : 1);
  }
  fs.mkdirSync(path.dirname(WEEK_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
  fs.writeFileSync(WEEK_PATH, weekJson + "\n");
  fs.writeFileSync(FIXTURE_PATH, fixtureJson + "\n");
  console.log(`week.json ${weekJson.length} bytes, frames48.json ${fixtureJson.length} bytes`);
}
main().catch((e) => { console.error(e); process.exit(1); });
