import { describe, expect, it } from "vitest";
import { deltaTC, wetBulbC } from "@/lib/engine/wetbulb";

describe("wet bulb", () => {
  it("Stull matches 20 C at 50% RH as about 13.7 C", () => {
    expect(Math.abs(wetBulbC(20, 50) - 13.7)).toBeLessThan(0.3);
    expect(deltaTC(20, 50)).toBeCloseTo(20 - wetBulbC(20, 50), 6);
  });
});
