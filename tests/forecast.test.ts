import { describe, expect, it } from "vitest";
import type { Assessment, SceneFrame, Status } from "../src/lib/contract";
import { earlyWarning, mergeWindows, nextSafeWindow, summarizeForecast, wobbleFrame } from "../src/lib/forecast";
import { MOCK_FRAME } from "../src/lib/mockFrame";

const base: SceneFrame = MOCK_FRAME;
const T0 = Date.parse("2026-11-15T10:00:00-07:00");
const frames = (n: number): SceneFrame[] =>
  Array.from({ length: n }, (_, i) => ({ ...base, time: new Date(T0 + i * 3600_000 - 7 * 3600_000).toISOString().slice(0, 19) + "-07:00" }));
const asm = (s: Status[]): Pick<Assessment, "status" | "reasons">[] =>
  s.map((status, i) => ({ status, reasons: [{ ruleId: "x", status, text: `r${i}`, source: { id: "s", short: "s", title: "s", kind: "heuristic" } }] }));

describe("forecast", () => {
  it("merges consecutive same-status hours into windows", () => {
    const w = mergeWindows(frames(5), asm(["GO", "GO", "STOP", "STOP", "GO"]));
    expect(w.map((x) => x.status)).toEqual(["GO", "STOP", "GO"]);
    expect(w[0].start).toBe(frames(1)[0].time);
    expect(Date.parse(w[0].end) - Date.parse(w[0].start)).toBe(2 * 3600_000);
  });
  it("next safe window skips a 1-hour GO", () => {
    const w = mergeWindows(frames(6), asm(["STOP", "GO", "STOP", "GO", "GO", "STOP"]));
    expect(nextSafeWindow(w)?.start).toBe(frames(4)[3].time);
    expect(nextSafeWindow(mergeWindows(frames(3), asm(["GO", "STOP", "GO"])))).toBeNull();
  });
  it("early warning picks first worsening hour within 6, ignores hour 7", () => {
    const f = frames(9);
    expect(earlyWarning(f, asm(["GO", "GO", "CAUTION", "STOP", "GO", "GO", "GO", "GO", "GO"]))?.reason).toBe("r2");
    expect(earlyWarning(f, asm(["GO", "GO", "GO", "GO", "GO", "GO", "GO", "STOP", "GO"]))).toBeNull();
    expect(summarizeForecast(f, asm(["CAUTION", "GO", "GO", "GO", "GO", "GO", "GO", "GO", "GO"])).earlyWarning).toBeNull();
  });
  it("wobble is deterministic per minute and small", () => {
    const a = wobbleFrame(base, "2026-11-15T10:01");
    expect(wobbleFrame(base, "2026-11-15T10:01")).toEqual(a);
    expect(a.derived.inversionF).toBeCloseTo(base.derived.inversionF, 9);
    expect(a.derived.speedShearMph).toBeCloseTo(base.derived.speedShearMph, 9);
    a.layers.forEach((l, i) => {
      expect(Math.abs(l.tempF - base.layers[i].tempF)).toBeLessThanOrEqual(0.2);
      expect(Math.abs(l.windMph - base.layers[i].windMph)).toBeLessThanOrEqual(0.3);
    });
  });
});
