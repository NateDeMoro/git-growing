import { describe, expect, it } from "vitest";
import { RULE_DOCS, SOURCES } from "@/lib/thresholds";

describe("thresholds", () => {
  it("every rule has at least one source with a kind and title", () => {
    for (const r of RULE_DOCS) {
      expect(r.sources.length).toBeGreaterThan(0);
      for (const s of r.sources) {
        expect(["standard", "guidance", "heuristic"]).toContain(s.kind);
        expect(s.title.length).toBeGreaterThan(5);
      }
    }
    expect(Object.keys(SOURCES).length).toBeGreaterThan(5);
  });
});
