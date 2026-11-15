// GET /api/station?offline=0|1 -> latest AZMet Yuma reading. Use when: single-station comparison card.
import { getStation } from "../../../lib/data/snapshot";
import { isOffline, json } from "../../../lib/data/route";

export async function GET(req: Request) {
  return json(await getStation(isOffline(req)));
}
