import { describe, expect, it } from "vitest";
import { nozzleLabel, nozzlesFor, topNozzle } from "../src/lib/nozzles";
import type { DropletClass } from "../src/lib/contract";

describe("nozzles", () => {
  it.each(["M", "C", "VC", "XC"] as DropletClass[])("%s has a nozzle with a source URL", (c) => {
    const n = topNozzle(c);
    expect(n).not.toBeNull();
    expect(n!.isoColor).toBeTruthy();
    expect(n!.psiMin).toBeLessThan(n!.psiMax);
    expect(n!.sources.length).toBeGreaterThan(0);
    for (const s of n!.sources) expect(s.url).toMatch(/^https:\/\//);
  });
  it("returns nothing for unsupported classes and null", () => {
    expect(nozzlesFor("UC")).toEqual([]);
    expect(nozzlesFor(null)).toEqual([]);
    expect(nozzleLabel(null)).toBe("");
  });
});
