import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { type HourlyRecord, angularDiffDeg, cToF, deriveFrame, fToC, lerpAngleDeg } from "../src/lib/derive";
import { buildSim } from "../scripts/sim-core";

const ROOT = path.resolve(__dirname, "..");
const cal = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "calibration.json"), "utf8"));
const week = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "sim", "week.json"), "utf8"));

const night: HourlyRecord = { time: "2026-10-26T02:00", t2mC: 12, t80mC: 20, ws10Kmh: 8, ws80Kmh: 20, wd10Deg: 350, wd80Deg: 20, rhPct: 60, cloudPct: 0, precipMm: 0, gustKmh: 15, pressureHpa: 1012 };
const day: HourlyRecord = { ...night, time: "2026-10-26T14:00", t2mC: 30, t80mC: 27 };

describe("deriveFrame", () => {
  for (const [name, rec] of [["inversion", night], ["lapse", day]] as const) {
    for (const k of [1, cal.k]) {
      it(`30 ft temperature lies between 2 m and scaled 80 m (${name}, k=${k})`, () => {
        const f = deriveFrame(rec, { ...cal, k });
        const t30 = fToC(f.layers.find((l) => l.heightFt === 30)!.tempF);
        const top = rec.t2mC + k * (rec.t80mC - rec.t2mC);
        expect(t30).toBeGreaterThanOrEqual(Math.min(rec.t2mC, top) - 1e-9);
        expect(t30).toBeLessThanOrEqual(Math.max(rec.t2mC, top) + 1e-9);
        if (k === 1) expect(t30).toBeLessThanOrEqual(Math.max(rec.t2mC, rec.t80mC));
      });
    }
  }
  it("5 ft is the 2 m value, layers ascend, summary matches layers", () => {
    const f = deriveFrame(night, cal);
    expect(f.layers.map((l) => l.heightFt)).toEqual([5, 15, 30, 60, 100, 160, 260]);
    expect(f.layers[0].tempF).toBeCloseTo(cToF(12), 6);
    expect(f.derived.inversionF).toBeCloseTo(f.layers[2].tempF - f.layers[0].tempF, 6);
    expect(f.derived.inversionF).toBeGreaterThan(0);
    expect(f.sun.isDay).toBe(false);
    expect(f.time).toBe("2026-10-26T02:00:00-07:00");
  });
  it("angle helpers use the shortest arc", () => {
    expect(angularDiffDeg(350, 10)).toBe(20);
    expect(lerpAngleDeg(350, 10, 0.5)).toBeCloseTo(0, 6);
  });
});

describe("week.json", () => {
  it("has 2016 frames at 5-minute spacing with no NaN or null", () => {
    expect(week.frames).toHaveLength(2016);
    const t0 = Date.parse(week.frames[0].time);
    week.frames.forEach((f: any, i: number) => expect(Date.parse(f.time) - t0).toBe(i * 300000));
    const bad = (v: unknown): boolean => v === null || (typeof v === "number" && !Number.isFinite(v)) || (typeof v === "object" && Object.values(v as object).some(bad));
    expect(week.frames.some(bad)).toBe(false);
  });
  it("beats are in range and in order", () => {
    expect(week.beats.map((b: any) => b.id)).toEqual(["A", "B", "C", "D", "E", "F"]);
    const idx = week.beats.map((b: any) => b.frameIndex);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    idx.forEach((i: number) => { expect(i).toBeGreaterThanOrEqual(0); expect(i).toBeLessThan(2016); });
  });
  it("Beat F peak has gusts >= 35 mph and rain >= 0.3 in/hr", () => {
    const f = week.frames[week.beats[5].frameIndex];
    expect(f.weather.gustMph).toBeGreaterThanOrEqual(35);
    expect(f.weather.rainInHr).toBeGreaterThanOrEqual(0.3);
  });
  it("rebuilding from the committed snapshot is byte-identical", () => {
    const b = buildSim();
    expect(b.weekJson + "\n").toBe(fs.readFileSync(path.join(ROOT, "public", "sim", "week.json"), "utf8"));
    expect(b.fixtureJson + "\n").toBe(fs.readFileSync(path.join(ROOT, "tests", "fixtures", "frames48.json"), "utf8"));
  });
});
