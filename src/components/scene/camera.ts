// Camera presets and flights. Use when: flying to overview/block/side/top or toggling 2D/3D on a MapLibre map.
import type { Map as MlMap } from "maplibre-gl";
import { SITE } from "@/lib/site";
import { centroid } from "@/lib/scene/geometry";

export type Preset = "overview" | "side" | "top";
const farmC = centroid(SITE.farmOutline);
export const FARM_CENTER: [number, number] = [farmC[0], farmC[1]];
export const SW_ARIZONA = { center: [-114.9, 32.4] as [number, number], zoom: 8.5, pitch: 0, bearing: 0 };

export function fly(map: MlMap, p: Preset | "block", blockId?: string) {
  const o = { essential: true, duration: 2200 };
  if (p === "overview") map.flyTo({ ...o, center: FARM_CENTER, zoom: map.getContainer().clientHeight < 600 ? 14.5 : 14.9, pitch: 55, bearing: -15 });
  else if (p === "top") map.flyTo({ ...o, duration: 1200, center: FARM_CENTER, zoom: map.getContainer().clientHeight < 600 ? 14.5 : 14.9, pitch: 0, bearing: 0 });
  else if (p === "side") map.flyTo({ ...o, center: [SITE.tower.lon, SITE.tower.lat], zoom: 17.2, pitch: 75, bearing: 90 });
  else {
    const b = SITE.blocks.find((x) => x.id === blockId);
    if (!b) return;
    const c = centroid(b.polygon);
    map.flyTo({ ...o, duration: 1600, center: [c[0], c[1]], zoom: 17, pitch: 60, bearing: map.getBearing() });
  }
}
