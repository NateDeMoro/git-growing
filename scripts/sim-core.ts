// Builds the deterministic demo week (2,016 frames, 5-minute steps, Beats A-F) from a committed hourly snapshot.
// Use when: building public/sim/week.json, or a test needs the rebuilt bytes. No network, no Date.now, no Math.random.
import fs from "node:fs";
import path from "node:path";
import type { Beat, Layer, SceneFrame, SimWeek } from "../src/lib/contract";
import {
  type Calibration, type HourlyRecord, cToF, deriveFrame, driftVector, lerpAngleDeg, localToMs, msToIso, summarize, sunInfo,
} from "../src/lib/derive";
import { SITE } from "../src/lib/site";

const ROOT = path.resolve(__dirname, "..");
export const SNAPSHOT_PATH = path.join(ROOT, "data", "snapshots", "week-hourly.json");
export const WEEK_START = "2026-10-25";
export const SEED = 20261115;
const FRAMES = 2016;
const STEP_MIN = 5;
const SD = (a: number, b: number) => ((b - a + 540) % 360) - 180; // signed shortest-arc difference

export interface Snapshot { lat: number; lon: number; start: string; records: HourlyRecord[] } // 169 hourly records

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Key = "t5" | "inv" | "s5" | "s30" | "d5" | "d30" | "rh" | "cloud" | "rain" | "gust" | "p";
type KF = { m: number; v: Partial<Record<Key, number>> }; // m: minutes from week start
interface BeatSpec { id: Beat["id"]; label: string; description: string; keys: KF[]; rampMin: number; landing: number; peak: number }

const smooth = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

function sunMinutes(day: number) {
  const dayStart = localToMs(WEEK_START + "T00:00") + day * 86400000;
  const s = sunInfo(dayStart + 12 * 3600000);
  return { sr: (localToMs(s.sunriseIso.slice(0, 16)) - localToMs(WEEK_START + "T00:00")) / 60000 | 0, ss: (localToMs(s.sunsetIso.slice(0, 16)) - localToMs(WEEK_START + "T00:00")) / 60000 | 0 };
}
const hm = (day: number, h: number, m = 0) => day * 1440 + h * 60 + m;

function beatSpecs(): BeatSpec[] {
  const s0 = sunMinutes(0), s1 = sunMinutes(1), s2 = sunMinutes(2);
  const A: BeatSpec = {
    id: "A", label: "Hidden inversion at dusk",
    description: "5 ft reads 5 mph and 72F and looks fine; 30 ft is 3F warmer. Full mode STOP, single station GO.",
    rampMin: 60, landing: s0.ss + 20, peak: s0.ss + 20,
    keys: [s0.ss - 10, s0.ss + 50].map((m) => ({ m, v: { t5: 72, inv: 3, s5: 5, s30: 6, d5: 300, d30: 312, rh: 40, cloud: 40, rain: 0, gust: 8 } })),
  };
  const b = (o: number, v: KF["v"]): KF => ({ m: s1.sr + o, v });
  const B: BeatSpec = {
    id: "B", label: "Inversion breaks, GO window opens",
    description: "About an hour after sunrise the inversion breaks and a GO window of more than 3 hours opens.",
    rampMin: 45, landing: s1.sr + 30, peak: s1.sr + 90,
    keys: [
      b(-30, { t5: 56, inv: 3.2, s5: 4.5, s30: 5.5, d5: 330, d30: 340, rh: 60, cloud: 10, rain: 0, gust: 8 }),
      b(40, { t5: 60, inv: 2.6, s5: 5, s30: 6, d5: 330, d30: 340, rh: 55, cloud: 10, rain: 0, gust: 8 }),
      b(65, { t5: 64, inv: -0.5, s5: 5, s30: 6, d5: 330, d30: 340, rh: 50, cloud: 10, rain: 0, gust: 8 }),
      b(270, { t5: 76, inv: -0.5, s5: 6, s30: 7, d5: 330, d30: 340, rh: 50, cloud: 10, rain: 0, gust: 8 }),
    ],
  };
  const cv = (s5: number, s30: number, gust: number): KF["v"] => ({ t5: 82, inv: -0.8, s5, s30, d5: 270, d30: 275, rh: 40, cloud: 15, rain: 0, gust });
  const C: BeatSpec = {
    id: "C", label: "Afternoon wind ramp at 30 ft",
    description: "The 30 ft wind ramps past 12 mph while 5 ft stays near 6 mph: wind and speed-shear STOP.",
    rampMin: 90, landing: hm(1, 15, 30), peak: hm(1, 15, 30),
    keys: [
      { m: hm(1, 13, 30), v: cv(5.5, 8, 12) }, { m: hm(1, 14, 30), v: cv(5.5, 13, 24) },
      { m: hm(1, 15, 30), v: cv(5.5, 18, 30) }, { m: hm(1, 16, 30), v: cv(5.5, 16, 28) },
    ],
  };
  const dv: KF["v"] = { t5: 80, inv: -0.3, s5: 5, s30: 6.5, d5: 190, d30: 310, rh: 45, cloud: 20, rain: 0, gust: 9 };
  const D: BeatSpec = {
    id: "D", label: "Wind direction splits 120 degrees",
    description: "5 ft and 30 ft winds differ by 120 degrees, both above 4 mph: direction-shear STOP.",
    rampMin: 60, landing: hm(2, 11), peak: hm(2, 11),
    keys: [{ m: hm(2, 10, 30), v: dv }, { m: hm(2, 11, 30), v: dv }],
  };
  const e = (o: number, v: KF["v"]): KF => ({ m: s2.ss + o, v: { d5: 250, d30: 255, cloud: 10, rain: 0, ...v } });
  const E: BeatSpec = {
    id: "E", label: "Calm clear evening: inversion forming",
    description: "Timing hint fires about 3 hours before sunset (CAUTION), then the inversion grows past 1.8F (STOP).",
    rampMin: 60, landing: s2.ss - 170, peak: s2.ss + 60,
    keys: [
      e(-210, { t5: 82, inv: -0.5, s5: 4, s30: 5, rh: 35, gust: 7 }),
      e(-60, { t5: 76, inv: 0.5, s5: 3.8, s30: 4.5, rh: 40, gust: 7 }),
      e(30, { t5: 70, inv: 2.2, s5: 3.5, s30: 4.5, rh: 48, gust: 6 }),
      e(90, { t5: 66, inv: 3, s5: 3.3, s30: 4.2, rh: 55, gust: 6 }),
    ],
  };
  const P = hm(3, 17);
  const f = (o: number, v: KF["v"]): KF => ({ m: P + o, v: { inv: -0.3, ...v } });
  const F: BeatSpec = {
    id: "F", label: "Simulated storm: frontal system",
    description: "Simulated storm over about 12 hours: cloud to 100%, pressure falls about 6 hPa, wind 6 to 25 mph, gusts near 40, rain to 0.4 in/hr.",
    rampMin: 120, landing: P, peak: P,
    keys: [
      f(-540, { t5: 74, s5: 6, s30: 7, d5: 270, d30: 275, rh: 50, cloud: 15, rain: 0, gust: 9, p: 0 }),
      f(-360, { t5: 78, s5: 6, s30: 7.5, d5: 270, d30: 275, rh: 45, cloud: 30, rain: 0, gust: 9.5, p: -0.4 }),
      f(-300, { t5: 78, s5: 6.5, s30: 8, d5: 270, d30: 285, rh: 48, cloud: 55, rain: 0, gust: 11, p: -1 }),
      f(-240, { t5: 76, s5: 7.5, s30: 9, d5: 270, d30: 300, rh: 55, cloud: 80, rain: 0, gust: 14, p: -1 }),
      f(-120, { t5: 72, s5: 10, s30: 13, d5: 265, d30: 320, rh: 70, cloud: 100, rain: 0.03, gust: 22, p: -5.8 }),
      f(-60, { t5: 68, s5: 15, s30: 20, d5: 255, d30: 335, rh: 80, cloud: 100, rain: 0.12, gust: 31, p: -6.3 }),
      f(0, { t5: 62, s5: 25, s30: 28, d5: 250, d30: 340, rh: 92, cloud: 100, rain: 0.45, gust: 40, p: -6.4 }),
      f(120, { t5: 61, s5: 18, s30: 21, d5: 255, d30: 320, rh: 90, cloud: 100, rain: 0.25, gust: 30, p: -6 }),
      f(180, { t5: 63, s5: 8, s30: 9, d5: 260, d30: 280, rh: 80, cloud: 85, rain: 0.03, gust: 14, p: -5 }),
    ],
  };
  return [A, B, C, D, E, F];
}

function envelope(spec: BeatSpec, minute: number): number {
  const first = spec.keys[0].m, last = spec.keys[spec.keys.length - 1].m;
  if (minute < first) return smooth((minute - (first - spec.rampMin)) / spec.rampMin);
  if (minute > last) return smooth(1 - (minute - last) / spec.rampMin);
  return 1;
}

function targetsAt(spec: BeatSpec, minute: number): Partial<Record<Key, number>> {
  const ks = spec.keys;
  if (minute <= ks[0].m) return ks[0].v;
  if (minute >= ks[ks.length - 1].m) return ks[ks.length - 1].v;
  let i = 0;
  while (ks[i + 1].m < minute) i++;
  const f = (minute - ks[i].m) / (ks[i + 1].m - ks[i].m);
  const out: Partial<Record<Key, number>> = {};
  for (const key of Object.keys(ks[i].v) as Key[]) {
    const a = ks[i].v[key]!, b = ks[i + 1].v[key]!;
    out[key] = key === "d5" || key === "d30" ? lerpAngleDeg(a, b, f) : lerp(a, b, f);
  }
  return out;
}

function interpRecord(recs: HourlyRecord[], i: number): HourlyRecord {
  const h = Math.floor(i / 12), f = (i % 12) / 12;
  const a = recs[h], b = recs[Math.min(h + 1, recs.length - 1)];
  const L = (x: number, y: number) => lerp(x, y, f);
  return {
    time: msToIso(localToMs(a.time) + (i % 12) * STEP_MIN * 60000).slice(0, 16),
    t2mC: L(a.t2mC, b.t2mC), t80mC: L(a.t80mC, b.t80mC), ws10Kmh: L(a.ws10Kmh, b.ws10Kmh), ws80Kmh: L(a.ws80Kmh, b.ws80Kmh),
    wd10Deg: lerpAngleDeg(a.wd10Deg, b.wd10Deg, f), wd80Deg: lerpAngleDeg(a.wd80Deg, b.wd80Deg, f),
    rhPct: L(a.rhPct, b.rhPct), cloudPct: L(a.cloudPct, b.cloudPct), precipMm: L(a.precipMm, b.precipMm),
    gustKmh: L(a.gustKmh, b.gustKmh), pressureHpa: L(a.pressureHpa, b.pressureHpa),
  };
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;
const r0 = (x: number) => Math.round(x);
const ABOVE_DECAY: Record<number, number> = { 60: 1, 100: 0.7, 160: 0.4, 260: 0.2 };

export function loadSnapshot(): Snapshot {
  if (!fs.existsSync(SNAPSHOT_PATH)) throw new Error("data/snapshots/week-hourly.json missing: run `npm run build-sim -- --refresh`");
  const s = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8")) as Snapshot;
  if (s.lat !== SITE.tower.lat || s.lon !== SITE.tower.lon) throw new Error("snapshot site differs from site.ts: run `npm run build-sim -- --refresh`");
  if (s.records.length !== 169) throw new Error("snapshot must hold 169 hourly records");
  return s;
}

export function loadCalibration(): Calibration {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "data", "calibration.json"), "utf8"));
}

export interface SimBuild { week: SimWeek & { meta: Record<string, unknown> }; weekJson: string; fixtureJson: string }

export function buildSim(snapshot: Snapshot = loadSnapshot(), cal: Calibration = loadCalibration()): SimBuild {
  const rand = mulberry32(SEED);
  const specs = beatSpecs();
  const n = LAYERS_N;
  // smooth noise channels: [frame][layer][t,s,d]
  const noise: number[][][] = [];
  const state = new Array(n * 3).fill(0);
  for (let i = 0; i < FRAMES; i++) {
    const row: number[][] = [];
    for (let l = 0; l < n; l++) {
      const c: number[] = [];
      for (let q = 0; q < 3; q++) {
        const idx = l * 3 + q;
        state[idx] = 0.92 * state[idx] + (rand() - 0.5) * 0.4;
        c.push(state[idx]);
      }
      row.push(c);
    }
    noise.push(row);
  }

  const frames: SceneFrame[] = [];
  const pressureRaw: number[] = [];
  const anchorP: Record<string, number> = {};
  for (let i = 0; i < FRAMES; i++) {
    const minute = i * STEP_MIN;
    const base = deriveFrame(interpRecord(snapshot.records, i), cal, { mode: "sim", source: "simulated" });
    const w = Math.max(...specs.map((s) => envelope(s, minute)));
    const layers: Layer[] = base.layers.map((L, li) => ({
      heightFt: L.heightFt,
      tempF: L.tempF + noise[i][li][0] * 0.5 * (1 - w),
      windMph: Math.max(0, L.windMph * (1 + noise[i][li][1] * 0.2 * (1 - w))),
      windDirDeg: (L.windDirDeg + noise[i][li][2] * 6 * (1 - w) + 360) % 360,
    }));
    let { cloudPct, rainInHr, gustMph, pressureHpa } = base.weather;
    let rh = base.derived.rhPct;
    for (const spec of specs) {
      const bw = envelope(spec, minute);
      if (bw <= 0) continue;
      const t = targetsAt(spec, minute);
      const g = (h: number) => layers.find((l) => l.heightFt === h)!;
      const l5 = g(5), l30 = g(30);
      const old5 = { ...l5 }, old30 = { ...l30 };
      const inv0 = l30.tempF - l5.tempF;
      if (t.t5 !== undefined) l5.tempF = lerp(l5.tempF, t.t5, bw);
      if (t.inv !== undefined) l30.tempF = l5.tempF + lerp(inv0, t.inv, bw);
      else l30.tempF += l5.tempF - old5.tempF;
      if (t.s5 !== undefined) l5.windMph = lerp(l5.windMph, t.s5, bw);
      if (t.s30 !== undefined) l30.windMph = lerp(l30.windMph, t.s30, bw);
      if (t.d5 !== undefined) l5.windDirDeg = lerpAngleDeg(l5.windDirDeg, t.d5, bw);
      if (t.d30 !== undefined) l30.windDirDeg = lerpAngleDeg(l30.windDirDeg, t.d30, bw);
      const d5 = { t: l5.tempF - old5.tempF, s: l5.windMph - old5.windMph, d: SD(old5.windDirDeg, l5.windDirDeg) };
      const d30 = { t: l30.tempF - old30.tempF, s: l30.windMph - old30.windMph, d: SD(old30.windDirDeg, l30.windDirDeg) };
      for (const L of layers) {
        if (L === l5 || L === l30) continue;
        let a: typeof d5;
        if (L.heightFt < 30) {
          const f = Math.log(L.heightFt / 5) / Math.log(30 / 5);
          a = { t: lerp(d5.t, d30.t, f), s: lerp(d5.s, d30.s, f), d: lerp(d5.d, d30.d, f) };
        } else {
          const k = ABOVE_DECAY[L.heightFt];
          a = { t: d30.t * k, s: d30.s * k, d: d30.d * k };
        }
        L.tempF += a.t; L.windMph = Math.max(0, L.windMph + a.s); L.windDirDeg = (L.windDirDeg + a.d + 360) % 360;
      }
      if (t.rh !== undefined) rh = lerp(rh, t.rh, bw);
      if (t.cloud !== undefined) cloudPct = lerp(cloudPct, t.cloud, bw);
      if (t.rain !== undefined) rainInHr = lerp(rainInHr, t.rain, bw);
      if (t.gust !== undefined) gustMph = lerp(gustMph, t.gust, bw);
      if (t.p !== undefined) {
        if (anchorP[spec.id] === undefined) anchorP[spec.id] = snapshotPressureAt(snapshot, spec.keys[0].m);
        pressureHpa = lerp(pressureHpa, anchorP[spec.id] + t.p, bw);
      }
    }
    const wind30 = layers.find((l) => l.heightFt === 30)!.windMph;
    gustMph = Math.max(gustMph, wind30 + 1);
    pressureRaw.push(pressureHpa);
    const rounded: Layer[] = layers.map((L) => ({ heightFt: L.heightFt, tempF: r1(L.tempF), windMph: r1(L.windMph), windDirDeg: r0(L.windDirDeg) % 360 }));
    const rhR = r1(rh);
    const s = summarize(rounded, rhR);
    frames.push({
      time: base.time, mode: "sim", tower: base.tower, layers: rounded,
      derived: { inversionF: r1(s.inversionF), speedShearMph: r1(s.speedShearMph), dirShearDeg: r0(s.dirShearDeg), deltaTC: r1(s.deltaTC), rhPct: rhR },
      sun: { elevationDeg: r1(base.sun.elevationDeg), isDay: base.sun.isDay, sunriseIso: base.sun.sunriseIso, sunsetIso: base.sun.sunsetIso },
      weather: { cloudPct: r0(cloudPct), rainInHr: r2(rainInHr), rainProbNext2hPct: 0, gustMph: r1(gustMph), pressureHpa: r1(pressureHpa), pressureTrendHpaPerHr: 0 },
      drift: { towardDeg: r0(driftVector(rounded).towardDeg) % 360, strength: r2(driftVector(rounded).strength) },
      context: { inversionForecastNext12h: false },
      frameIndex: i, source: "simulated",
    });
  }

  // second pass: pressure tendency (1 h), rain probability, inversion outlook, beats, look-ahead
  const beats: (Beat & Record<string, unknown>)[] = specs.map((s) => ({
    id: s.id, label: s.label, frameIndex: Math.round(s.landing / STEP_MIN),
    startFrameIndex: Math.round(s.keys[0].m / STEP_MIN), peakFrameIndex: Math.round(s.peak / STEP_MIN), description: s.description,
  }));
  for (let i = 0; i < FRAMES; i++) {
    const f = frames[i];
    const trend = i >= 12 ? pressureRaw[i] - pressureRaw[i - 12] : pressureRaw[12] - pressureRaw[0];
    f.weather.pressureTrendHpaPerHr = r2(trend);
    let rainSoon = false;
    for (let j = i; j <= Math.min(i + 24, FRAMES - 1); j++) if (frames[j].weather.rainInHr >= 0.01) { rainSoon = true; break; }
    f.weather.rainProbNext2hPct = rainSoon ? 70 : 0;
    let inv = false;
    for (let j = i + 1; j <= Math.min(i + 144, FRAMES - 1); j++) if (frames[j].derived.inversionF >= 1.8) { inv = true; break; }
    f.context.inversionForecastNext12h = inv;
    const next = beats.find((b) => b.frameIndex > i);
    const la: SceneFrame["lookAhead"] = {};
    if (next) { la.nextBeatId = next.id; la.nextBeatFrameIndex = next.frameIndex; }
    la.frameIndexPlus3h = Math.min(i + 36, FRAMES - 1);
    f.lookAhead = la;
  }
  for (const b of beats) frames[b.frameIndex].beatId = b.id;

  const week = {
    generatedFrom: `open-meteo historical-forecast ${WEEK_START}..2026-10-31 (simulated beats and storm overlaid)`,
    stepMinutes: 5 as const,
    meta: {
      sourceWeek: { start: WEEK_START, end: "2026-10-31" }, seed: SEED, calibrationK: cal.k, site: SITE.tower,
      note: "Beat F is a simulated storm. Tower values are derived from model data and calibrated to published tower magnitudes.",
    },
    beats: beats as unknown as Beat[],
    frames,
  };
  const weekJson = JSON.stringify(week);
  const pick = (a: number, b: number) => frames.slice(a, b);
  const aIdx = beats[0].frameIndex, fIdx = beats[5].frameIndex;
  const fixture = {
    generatedFrom: week.generatedFrom, stepMinutes: 5, beats: week.beats,
    frames: [...pick(aIdx - 18, aIdx + 18), ...pick(fIdx - 11, fIdx + 1)],
  };
  return { week, weekJson, fixtureJson: JSON.stringify(fixture) };
}

const LAYERS_N = 7;

function snapshotPressureAt(s: Snapshot, minute: number): number {
  const i = Math.round(minute / STEP_MIN);
  return interpRecord(s.records, i).pressureHpa;
}

export { cToF };
