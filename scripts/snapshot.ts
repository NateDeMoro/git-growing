// Writes data/snapshots/{open-meteo-forecast,nws-gridpoint,azmet}.json from live sources at the SITE tower point.
// Use when: refreshing offline data (after the site pin changes, or before a demo). Run: npm run snapshot
import { mkdirSync, writeFileSync } from "node:fs";
import { SITE } from "../src/lib/site";
import { fetchOpenMeteoForecast } from "../src/lib/data/openMeteo";
import { fetchNwsGridpoint } from "../src/lib/data/nws";
import { fetchAzmetHours } from "../src/lib/data/azmet";

const { lat, lon } = SITE.tower;
const dir = "data/snapshots";
mkdirSync(dir, { recursive: true });

function write(name: string, sources: string[], data: unknown) {
  writeFileSync(
    `${dir}/${name}.json`,
    JSON.stringify({ fetchedAt: new Date().toISOString(), lat, lon, sources, data }) + "\n",
  );
  console.log(`wrote ${name}.json`);
}

async function main() {
  const om = await fetchOpenMeteoForecast(lat, lon, 20000);
  write("open-meteo-forecast", ["Open-Meteo"], om);
  console.log(`  ${om.length} hours, ${om[0].time} .. ${om.at(-1)!.time}`);

  try {
    const nws = await fetchNwsGridpoint(lat, lon, 20000, true);
    write("nws-gridpoint", ["NWS gridpoint"], nws);
    console.log(`  ${nws.length} hours`);
  } catch (e) {
    console.error("NWS failed, keeping previous snapshot:", e);
  }

  const rows = await fetchAzmetHours(SITE.azmetStationId, 48, 20000);
  write("azmet", [`AZMet ${SITE.azmetStationId}`], rows);
  console.log(`  ${rows.length} rows, latest ${rows.at(-1)?.time}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
