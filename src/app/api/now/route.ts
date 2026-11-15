// GET /api/now?offline=0|1 -> current hour's normalized record. Use when: live NOW panel (W5 derives the frame).
import { getForecast } from "../../../lib/data/snapshot";
import { isOffline, json } from "../../../lib/data/route";
import { phoenixHour } from "../../../lib/data/time";

export async function GET(req: Request) {
  const fc = await getForecast(isOffline(req));
  const hour = phoenixHour();
  let rec = fc.data.find((r) => r.time === hour);
  let stale = false;
  if (!rec) {
    // Snapshot does not cover now: reuse the same hour of day so the demo still looks alive.
    stale = true;
    rec = fc.data.find((r) => r.time.slice(11) === hour.slice(11)) ?? fc.data[0];
  }
  return json({ data: rec, dataTime: fc.dataTime, sources: fc.sources, source: fc.source, stale, requestedHour: hour });
}
