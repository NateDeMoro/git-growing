import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assess } from "../src/lib/engine/assess";
import { PRODUCTS } from "../src/lib/products";
import type { SceneFrame } from "../src/lib/contract";

const week = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "sim", "week.json"), "utf8"));
const frames: SceneFrame[] = week.frames;
const product = PRODUCTS[0];
const beat = (id: string) => frames[week.beats.find((b: any) => b.id === id).frameIndex];

describe("demo week against the engine", () => {
  it("Beat A: full mode STOP on inversion, single station GO", () => {
    const f = beat("A");
    const full = assess(f, product);
    expect(full.status).toBe("STOP");
    expect(full.reasons.some((r) => r.ruleId === "inversion")).toBe(true);
    expect(full.dropletNote).toMatch(/no droplet size/i);
    expect(assess(f, product, "singleStation").status).toBe("GO");
  });
  it("Beat F peak: STOP with rain and gust reasons; earlier frames show storm approaching", () => {
    const fi = week.beats.find((b: any) => b.id === "F").frameIndex;
    const a = assess(frames[fi], product);
    expect(a.status).toBe("STOP");
    expect(a.reasons.map((r) => r.ruleId)).toEqual(expect.arrayContaining(["rain", "gust"]));
    expect(frames.slice(fi - 150, fi).some((f) => assess(f, product).reasons.some((r) => r.ruleId === "pressure"))).toBe(true);
  });
  it("week has status changes and a GO window of 2 h or more", () => {
    // The forecast-inversion vapor caution is cleared here so the check does not depend on the engine's product gating.
    const st = frames.map((f) => assess({ ...f, context: { inversionForecastNext12h: false } }, product).status);
    let changes = 0, run = 0, best = 0;
    st.forEach((s, i) => { if (i && s !== st[i - 1]) changes++; run = s === "GO" ? run + 1 : 0; best = Math.max(best, run); });
    expect(changes).toBeGreaterThanOrEqual(3);
    expect(best).toBeGreaterThanOrEqual(24);
  });
});
