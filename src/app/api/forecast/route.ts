// GET /api/forecast?offline=0|1 -> hourly derived frames (7 days) + NWS overlay. Assessment runs on the client (buildForecast).
// Use when: forecast tab. Response: { frames, nowIndex, nws, dataTime, sources, source, nwsSource, stale, cached }.
import { getForecast, getNws } from "../../../lib/data/snapshot";
import { isOffline, json } from "../../../lib/data/route";
import { phoenixHour } from "../../../lib/data/time";
import { deriveForecastFrames, nowIndexFor, nwsOverlay } from "../../../lib/forecast";
import calibration from "../../../../data/calibration.json";

export async function GET(req: Request) {
  const offline = isOffline(req);
  const [fc, nws] = await Promise.all([getForecast(offline), getNws(offline)]);
  const cached = fc.source === "snapshot";
  const frames = deriveForecastFrames(fc.data, calibration, { source: cached ? "snapshot" : "open-meteo", cached });
  const hour = phoenixHour();
  const nowIndex = nowIndexFor(frames, hour);
  const stale = (fc.data.at(-1)?.time ?? "") < hour;
  return json({
    frames,
    nowIndex,
    nws: nwsOverlay(nws.data, frames),
    dataTime: fc.dataTime,
    sources: [...fc.sources, ...nws.sources],
    source: fc.source,
    nwsSource: nws.source,
    stale,
    cached,
  });
}
