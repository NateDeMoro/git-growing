// Wind to velocity. Use when: turning a layer's speed and "from" direction into an east/north velocity.
export const MPH_TO_MS = 0.44704;

/** Meteorological direction (comes FROM, 0 = north). Returns velocity in m/s: east, north. North wind blows south. */
export function windVelocity(speedMph: number, fromDeg: number, scale = 1): { east: number; north: number } {
  const v = speedMph * MPH_TO_MS * scale;
  const r = (fromDeg * Math.PI) / 180;
  return { east: -v * Math.sin(r), north: -v * Math.cos(r) };
}

/** Inverse of windVelocity: returns speed (mph) and from-direction (deg). */
export function velocityToWind(east: number, north: number): { mph: number; fromDeg: number } {
  const mph = Math.hypot(east, north) / MPH_TO_MS;
  const fromDeg = ((Math.atan2(-east, -north) * 180) / Math.PI + 360) % 360;
  return { mph, fromDeg };
}
