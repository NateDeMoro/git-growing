// Particle simulation on preallocated typed arrays (positions in local metres from the tower).
// Use when: updating wind and rain particles each animation tick without allocating.
import type { Layer } from "@/lib/contract";
import { windVelocity } from "@/lib/scene/wind";
import { advectOne, type Box } from "@/lib/scene/advect";
import { sceneElevationM } from "@/lib/scene/geometry";

export const SPEED_SCALE = 15; // visual speed-up of real wind so motion reads at farm scale
export const TRAIL = 5;
export const WIND_PER_LAYER = 250;
export const RAIN_MAX = 1400;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PathBuf {
  length: number;
  startIndices: Uint32Array;
  path: Float32Array;
  color: Uint8Array;
}

function makeBuf(n: number, pts: number): PathBuf {
  const s = new Uint32Array(n + 1);
  for (let i = 0; i <= n; i++) s[i] = i * pts;
  return { length: n, startIndices: s, path: new Float32Array(n * pts * 3), color: new Uint8Array(n * pts * 4) };
}

export class WindSim {
  n: number;
  head: Float32Array;
  buf: PathBuf;
  r = rng(11);
  box: Box = { minX: -500, minY: -800, maxX: 500, maxY: 600 };
  constructor(public layerCount: number) {
    this.n = layerCount * WIND_PER_LAYER;
    this.head = new Float32Array(this.n * 3);
    this.buf = makeBuf(this.n, TRAIL);
    this.respawn(this.box);
  }
  respawn(box: Box) {
    this.box = box;
    for (let i = 0; i < this.n; i++) {
      this.head[i * 3] = box.minX + this.r() * (box.maxX - box.minX);
      this.head[i * 3 + 1] = box.minY + this.r() * (box.maxY - box.minY);
    }
  }
  /** tauS = trail length in seconds (longer in gusts). */
  update(dt: number, layers: Layer[], tauS: number) {
    const { head, buf } = this;
    const L = Math.min(layers.length, this.layerCount);
    for (let li = 0; li < L; li++) {
      const l = layers[li];
      const v = windVelocity(l.windMph, l.windDirDeg, SPEED_SCALE);
      const z = sceneElevationM(l.heightFt);
      const bold = l.heightFt === 5 || l.heightFt === 30;
      const col: [number, number, number] = l.heightFt === 5 ? [90, 220, 255] : l.heightFt === 30 ? [255, 225, 110] : [190, 200, 225];
      const aMax = bold ? 235 : 110;
      for (let k = 0; k < WIND_PER_LAYER; k++) {
        const i = li * WIND_PER_LAYER + k;
        advectOne(head, i, 3, v.east, v.north, dt, this.box);
        head[i * 3 + 2] = z;
        for (let t = 0; t < TRAIL; t++) {
          const o = (i * TRAIL + t) * 3;
          const f = (t / (TRAIL - 1)) * tauS;
          buf.path[o] = head[i * 3] - v.east * f;
          buf.path[o + 1] = head[i * 3 + 1] - v.north * f;
          buf.path[o + 2] = z;
          const c = (i * TRAIL + t) * 4;
          buf.color[c] = col[0]; buf.color[c + 1] = col[1]; buf.color[c + 2] = col[2];
          buf.color[c + 3] = Math.round(aMax * (1 - t / TRAIL));
        }
      }
    }
  }
}

export class RainSim {
  head = new Float32Array(RAIN_MAX * 3);
  buf = makeBuf(RAIN_MAX, 2);
  active = 0;
  r = rng(37);
  box: Box = { minX: -600, minY: -900, maxX: 600, maxY: 700 };
  top = 800;
  constructor() {
    for (let i = 0; i < RAIN_MAX; i++) {
      this.head[i * 3] = this.box.minX + this.r() * 1200;
      this.head[i * 3 + 1] = this.box.minY + this.r() * 1600;
      this.head[i * 3 + 2] = this.r() * this.top;
    }
    for (let i = 0; i < RAIN_MAX; i++) { this.buf.color.fill(190, i * 8, i * 8 + 3); this.buf.color[i * 8 + 3] = 40; this.buf.color[i * 8 + 7] = 170; }
  }
  update(dt: number, rainInHr: number, upper: Layer | undefined) {
    this.active = Math.round(Math.min(1, rainInHr / 0.3) * RAIN_MAX);
    if (!this.active) return;
    const fall = 110 + Math.min(1, rainInHr / 0.3) * 120;
    const w = upper ? windVelocity(upper.windMph, upper.windDirDeg, 4) : { east: 0, north: 0 };
    for (let i = 0; i < this.active; i++) {
      this.head[i * 3] += w.east * dt;
      this.head[i * 3 + 1] += w.north * dt;
      this.head[i * 3 + 2] -= fall * dt;
      if (this.head[i * 3 + 2] < 0) {
        this.head[i * 3 + 2] = this.top;
        this.head[i * 3] = this.box.minX + this.r() * 1200;
        this.head[i * 3 + 1] = this.box.minY + this.r() * 1600;
      }
      const o = i * 6, tau = 0.07;
      this.buf.path[o] = this.head[i * 3] ; this.buf.path[o + 1] = this.head[i * 3 + 1]; this.buf.path[o + 2] = this.head[i * 3 + 2];
      this.buf.path[o + 3] = this.head[i * 3] - w.east * tau; this.buf.path[o + 4] = this.head[i * 3 + 1] - w.north * tau; this.buf.path[o + 5] = this.head[i * 3 + 2] + fall * tau;
    }
  }
}
