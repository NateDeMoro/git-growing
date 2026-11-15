// Particle simulation on preallocated typed arrays (positions in local metres from the tower).
// Use when: updating wind, drift and rain particles each animation tick without allocating.
import type { Layer } from "@/lib/contract";
import { windVelocity } from "@/lib/scene/wind";
import { advectOne, type Box } from "@/lib/scene/advect";
import { sceneElevationM } from "@/lib/scene/geometry";
import type { DriftBehavior } from "@/lib/scene/drift";

export const SPEED_SCALE = 15; // visual speed-up of real wind so motion reads at farm scale
export const TRAIL = 5;
export const WIND_PER_LAYER = 250;
export const DRIFT_N = 700;
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

export class DriftSim {
  head = new Float32Array(DRIFT_N * 3);
  age = new Float32Array(DRIFT_N);
  life = new Float32Array(DRIFT_N);
  lat = new Float32Array(DRIFT_N);
  zf = new Float32Array(DRIFT_N);
  rr = new Float32Array(DRIFT_N);
  buf = makeBuf(DRIFT_N, TRAIL);
  active = 0;
  r = rng(23);
  trees: Float32Array = new Float32Array(0); // local x,y pairs of the focused block
  constructor() {
    for (let i = 0; i < DRIFT_N; i++) {
      this.rr[i] = this.r();
      this.zf[i] = 0.6 + 0.4 * this.r();
      this.life[i] = 1;
      this.age[i] = this.r() * 10; // staggered
      this.lat[i] = this.r() * 2 - 1;
    }
  }
  setTrees(t: Float32Array) {
    this.trees = t;
    for (let i = 0; i < DRIFT_N; i++) this.spawn(i, true);
  }
  spawn(i: number, stagger = false) {
    const nT = this.trees.length / 2;
    if (nT > 0) {
      const k = Math.floor(this.r() * nT);
      this.head[i * 3] = this.trees[k * 2];
      this.head[i * 3 + 1] = this.trees[k * 2 + 1];
    }
    this.head[i * 3 + 2] = 2 + this.r() * 8;
    this.age[i] = stagger ? -this.r() * 8 : 0;
    this.lat[i] = this.r() * 2 - 1;
    this.zf[i] = 0.6 + 0.4 * this.r();
  }
  update(dt: number, layers: Layer[], b: DriftBehavior, on: boolean, tauS: number) {
    this.active = on ? DRIFT_N : 0;
    if (!on || layers.length === 0) return;
    const { head, buf } = this;
    const ceilM = b.ceilingFt === null ? Infinity : sceneElevationM(b.ceilingFt);
    for (let i = 0; i < DRIFT_N; i++) {
      this.age[i] += dt;
      const a = this.age[i];
      if (a < 0) { for (let t = 0; t < TRAIL; t++) buf.color[(i * TRAIL + t) * 4 + 3] = 0; continue; }
      const hFt = head[i * 3 + 2] / (0.3048 * 10);
      let li = 0;
      for (let k = 0; k < layers.length; k++) if (Math.abs(layers[k].heightFt - hFt) < Math.abs(layers[li].heightFt - hFt)) li = k;
      const lay = layers[li];
      const v = windVelocity(lay.windMph, lay.windDirDeg, SPEED_SCALE * (b.regime === "storm" ? 1.6 : 0.8));
      const sp = Math.hypot(v.east, v.north) || 1;
      const life = Math.min(20, Math.max(2.5, b.reachM / sp)) * (0.7 + 0.6 * this.rr[i]) / b.fadeSpeed;
      if (a > life) { this.spawn(i); continue; }
      const lat = this.lat[i] * b.spreadSideways * (b.regime === "inversion" ? 6 : 3);
      const vx = v.east + (-v.north / sp) * lat * SPEED_SCALE * 0.3;
      const vy = v.north + (v.east / sp) * lat * SPEED_SCALE * 0.3;
      let vz = sceneElevationM(b.riseFtPerS) * (0.5 + this.rr[i]);
      let z = head[i * 3 + 2] + vz * dt;
      const zmax = ceilM * this.zf[i];
      if (z > zmax) { z = zmax; vz = 0; }
      head[i * 3] += vx * dt;
      head[i * 3 + 1] += vy * dt;
      head[i * 3 + 2] = z;
      const fade = Math.pow(1 - a / life, 0.7) * Math.min(1, a * 4);
      const hot = b.regime === "inversion" ? [255, 110, 70] : b.regime === "go" ? [250, 220, 130] : [255, 160, 70];
      for (let t = 0; t < TRAIL; t++) {
        const f = (t / (TRAIL - 1)) * tauS;
        const o = (i * TRAIL + t) * 3;
        buf.path[o] = head[i * 3] - vx * f;
        buf.path[o + 1] = head[i * 3 + 1] - vy * f;
        buf.path[o + 2] = Math.max(0, z - vz * f);
        const c = (i * TRAIL + t) * 4;
        buf.color[c] = hot[0]; buf.color[c + 1] = hot[1]; buf.color[c + 2] = hot[2];
        buf.color[c + 3] = Math.round(235 * fade * (1 - t / TRAIL));
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
