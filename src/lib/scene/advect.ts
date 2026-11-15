// One advection step with wrap-around. Use when: moving wind/rain particles stored in a preallocated Float32Array.
export interface Box { minX: number; minY: number; maxX: number; maxY: number }

/** Moves particle i (x,y at pos[i*stride], pos[i*stride+1]) by v*dt and wraps it inside box, in place. */
export function advectOne(pos: Float32Array, i: number, stride: number, vx: number, vy: number, dt: number, box: Box): void {
  const o = i * stride;
  const w = box.maxX - box.minX, h = box.maxY - box.minY;
  let x = pos[o] + vx * dt;
  let y = pos[o + 1] + vy * dt;
  x = box.minX + ((((x - box.minX) % w) + w) % w);
  y = box.minY + ((((y - box.minY) % h) + h) % h);
  pos[o] = x;
  pos[o + 1] = y;
}
