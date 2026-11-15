// GET /api/forecast?offline=0|1 -> 7 days hourly model data + NWS overlay. Use when: forecast tab / window search.
import { getForecast, getNws } from "../../../lib/data/snapshot";
import { isOffline, json } from "../../../lib/data/route";

export async function GET(req: Request) {
  const offline = isOffline(req);
  const [fc, nws] = await Promise.all([getForecast(offline), getNws(offline)]);
  return json({
    data: { hourly: fc.data, nws: nws.data },
    dataTime: fc.dataTime,
    sources: [...fc.sources, ...nws.sources],
    source: fc.source,
    nwsSource: nws.source,
  });
}
