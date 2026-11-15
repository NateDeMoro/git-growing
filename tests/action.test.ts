import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { actionLine, cautionAction } from "../src/lib/engine/action";
import { assess } from "../src/lib/engine/assess";
import { buildForecast } from "../src/lib/forecast";
import { DEFAULT_PRODUCT_ID, productById } from "../src/lib/products";
import type { SceneFrame } from "../src/lib/contract";

const week = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "sim", "week.json"), "utf8"));
const frames: SceneFrame[] = week.frames;
const product = productById(DEFAULT_PRODUCT_ID);
const beatIdx = (id: string): number => week.beats.find((b: any) => b.id === id).frameIndex;
const hourly = (idx: number) => frames.filter((_, i) => i >= idx && (i - idx) % 12 === 0).slice(0, 48).map((f) => ({ ...f, mode: "forecast" as const }));
const lineAt = (idx: number) => {
  const a = assess(frames[idx], product);
  const fc = buildForecast(hourly(idx), product);
  return { a, fc, line: actionLine({ assessment: a, frame: frames[idx], product, nextSafeStart: fc.nextSafeWindow?.start, earlyWarning: fc.earlyWarning }) };
};

describe("Do this line", () => {
  it("Beat A (STOP, inversion): don't spray, says why and when it is next safe", () => {
    const { a, line } = lineAt(beatIdx("A"));
    expect(a.status).toBe("STOP");
    expect(line).toMatch(/^Don't spray/);
    expect(line).toMatch(/^Don't spray: inversion \(30 ft is 3\.0°F warmer\)\. Next safe window starts/);
    expect(line).not.toMatch(/undefined|traps spray/);
    expect(line).toMatch(/Next safe window starts \w{3} \d{1,2}:\d{2} (AM|PM)/);
  });
  it("Beat B landing (inversion breaking): still STOP, next safe window is soon", () => {
    const { a, line } = lineAt(beatIdx("B"));
    expect(a.status).toBe("STOP");
    expect(line).toMatch(/^Don't spray: inversion.*Next safe window starts/);
  });
  it("Beat B peak (GO window open): spray now with a droplet class and a wind stop", () => {
    const peak = week.beats.find((b: any) => b.id === "B").peakFrameIndex;
    const { a, line } = lineAt(peak);
    expect(a.status).toBe("GO");
    expect(line).toMatch(/^Spray now with Medium \(M\) or larger droplets/);
    expect(line).toContain(`${product.labelWindMaxMph} mph`);
  });
  it("Beat F (STOP, storm): don't spray with the rain/gust cause", () => {
    const { a, line } = lineAt(beatIdx("F"));
    expect(a.status).toBe("STOP");
    expect(line).toMatch(/^Don't spray: wind 25 mph, over the 10 mph limit\./);
    expect(line).not.toMatch(/undefined/);
  });
});

describe("CAUTION kind and line", () => {
  const src = { ruleId: "x" } as any;
  const mk = (...ids: string[]) => ({ ...assess(frames[beatIdx("B")], product), status: "CAUTION" as const, recommendedDroplet: "VC" as const,
    reasons: ids.map((ruleId) => ({ ruleId, status: "CAUTION" as const, text: ruleId, source: src })) });
  it("deltaT only: spray with care, Very Coarse", () => {
    const r = cautionAction({ assessment: mk("deltaT"), product });
    expect(r.kind).toBe("care");
    expect(r.line).toMatch(/^OK to spray if: .*Very Coarse \(VC\)/);
  });
  it("gust: wait, with or without a known window", () => {
    expect(cautionAction({ assessment: mk("gust"), product, nextSafeStart: "2026-05-04T09:30:00-07:00" })).toEqual({ kind: "wait", line: "Wait until Mon 9:30 AM." });
    expect(cautionAction({ assessment: mk("gust"), product }).line).toBe("Wait and recheck in an hour.");
  });
  it("mixed care + wait: wait wins", () => {
    expect(cautionAction({ assessment: mk("deltaT", "gust"), product }).kind).toBe("wait");
  });
  it("two care conditions are joined, pressure uses early-warning hours", () => {
    const r = cautionAction({ assessment: mk("pressure", "timingHint", "rainChance"), product, earlyWarning: { at: "", status: "STOP", reason: "", hours: 2 } });
    expect(r.line).toBe("OK to spray if: you finish within 2 hours, before the storm; you don't start a new block and you finish the one you're on. Use Very Coarse (VC) or coarser droplets.");
  });
  it("deltaT nozzle condition is never cut by the two-condition limit", () => {
    const r = cautionAction({ assessment: mk("windHigh", "pressure", "deltaT"), product });
    expect(r.kind).toBe("care");
    expect(r.line).toMatch(/Very Coarse \(VC\)/);
  });
  it("a real CAUTION frame gives a non-empty OK/Wait line", () => {
    const idx = frames.findIndex((f) => assess(f, product).status === "CAUTION");
    expect(idx).toBeGreaterThanOrEqual(0);
    const { line } = lineAt(idx);
    expect(line).toMatch(/^(OK to spray if|Wait)/);
    expect(line).not.toMatch(/undefined|NaN/);
  });
});

describe("one early-warning source", () => {
  it("the same hourly frames give the same early warning whichever tab reads them", () => {
    let idx = beatIdx("B") + 12;
    while (!buildForecast(hourly(idx), product).earlyWarning && idx < frames.length - 600) idx += 12;
    const a = buildForecast(hourly(idx), product).earlyWarning;
    const b = buildForecast(hourly(idx), product).earlyWarning;
    expect(a).toEqual(b);
    expect(a?.hours).toBeGreaterThan(0);
  });
});
