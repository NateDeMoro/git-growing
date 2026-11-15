// GET /api/now?offline=0|1 -> current hour's derived SceneFrame (mode "live") with a minute-seeded wobble.
// Use when: live NOW panel. Response: { frame, dataTime, sources, source: "live"|"snapshot", stale, cached, requestedHour }.
import { getForecast } from "../../../lib/data/snapshot";
import { isOffline, json } from "../../../lib/data/route";
import { phoenixHour, phoenixMinute } from "../../../lib/data/time";
import { deriveForecastFrames, nowIndexFor, wobbleFrame } from "../../../lib/forecast";
import calibration from "../../../../data/calibration.json";

export async function GET(req: Request) {
  const fc = await getForecast(isOffline(req));
  const cached = fc.source === "snapshot";
  const hour = phoenixHour();
  const frames = deriveForecastFrames(fc.data, calibration, { source: fc.source === "live" ? "open-meteo" : "snapshot", cached, mode: "live" });
  const i = nowIndexFor(frames, hour);
  const stale = Date.parse(frames[i].time) !== Date.parse(hour + ":00-07:00");
  const frame = wobbleFrame(frames[i], phoenixMinute());
  return json({ frame, dataTime: fc.dataTime, sources: fc.sources, source: fc.source, stale, cached, requestedHour: hour });
}
