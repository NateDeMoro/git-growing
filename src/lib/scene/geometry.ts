// Scene geometry helpers. Use when: converting feet to scene elevation, or lon/lat to local metres near the site.
// Pure: no React, no deck imports.
export const HEIGHT_EXAGGERATION = 10; // the single 10x factor ("Heights x10")
export const FT_TO_M = 0.3048;
const M_PER_DEG_LAT = 110574;

/** Feet above ground to scene elevation in FEET (10x). Use when: labels or tests. */
export function sceneElevationFt(ft: number): number {
  return ft * HEIGHT_EXAGGERATION;
}

/** Feet above ground to scene elevation in METRES (10x). Use when: setting deck z. */
export function sceneElevationM(ft: number): number {
  return ft * FT_TO_M * HEIGHT_EXAGGERATION;
}

/** Metres east/north to degrees lon/lat at a latitude. */
export function metersToDegrees(eastM: number, northM: number, latDeg: number): [number, number] {
  return [eastM / (111320 * Math.cos((latDeg * Math.PI) / 180)), northM / M_PER_DEG_LAT];
}

export interface Origin {
  lon: number;
  lat: number;
}

/** [lon, lat] to local metres [east, north] from an origin. */
export function toLocal(lon: number, lat: number, o: Origin): [number, number] {
  return [(lon - o.lon) * 111320 * Math.cos((o.lat * Math.PI) / 180), (lat - o.lat) * M_PER_DEG_LAT];
}

/** Local metres back to [lon, lat]. */
export function fromLocal(x: number, y: number, o: Origin): [number, number] {
  const [dx, dy] = metersToDegrees(x, y, o.lat);
  return [o.lon + dx, o.lat + dy];
}

export function polygonLocal(poly: [number, number][], o: Origin): [number, number][] {
  return poly.map(([lo, la]) => toLocal(lo, la, o));
}

export function pointInPolygon(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function bounds(poly: [number, number][]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function centroid(poly: [number, number][]): [number, number] {
  let sx = 0, sy = 0;
  for (const [x, y] of poly) { sx += x; sy += y; }
  return [sx / poly.length, sy / poly.length];
}

export function polygonAreaAcres(polyLocal: [number, number][]): number {
  let s = 0;
  for (let i = 0; i < polyLocal.length; i++) {
    const [a, b] = polyLocal[i];
    const [c, d] = polyLocal[(i + 1) % polyLocal.length];
    s += a * d - c * b;
  }
  return Math.abs(s) / 2 / 4046.856;
}
