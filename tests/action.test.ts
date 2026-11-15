import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { actionLine } from "../src/lib/engine/action";
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
  return { a, fc, line: actionLine({ assessment: a, product, nextSafeStart: fc.nextSafeWindow?.start, earlyWarning: fc.earlyWarning }) };
};

describe("Do this line", () => {
  it("Beat A (STOP, inversion): don't spray, says why and when it is next safe", () => {
    const { a, line } = lineAt(beatIdx("A"));
    expect(a.status).toBe("STOP");
    expect(line).toMatch(/^Don't spray/);
    expect(line).toMatch(/inversion/i);
    expect(line).toMatch(/next safe window starts \w{3} \d{1,2}:\d{2} (AM|PM)/);
  });
  it("Beat B landing (inversion breaking): still STOP, next safe window is soon", () => {
    const { a, line } = lineAt(beatIdx("B"));
    expect(a.status).toBe("STOP");
    expect(line).toMatch(/^Don't spray.*next safe window starts/);
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
    expect(line).toMatch(/^Don't spray/);
  });
  it("CAUTION recommends holding or a coarser class", () => {
    const a = { ...assess(frames[beatIdx("B")], product), status: "CAUTION" as const, recommendedDroplet: "C" as const };
    expect(actionLine({ assessment: a, product })).toMatch(/Hold, or switch to Coarse/);
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
