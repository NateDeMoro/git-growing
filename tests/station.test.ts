import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assess } from "../src/lib/engine/assess";
import { DEFAULT_PRODUCT_ID, productById } from "../src/lib/products";

const week = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "sim", "week.json"), "utf8"));

describe("single-station comparison", () => {
  it("Beat A (frame 219): tower STOP, 5 ft station alone GO", () => {
    const product = productById(DEFAULT_PRODUCT_ID);
    const frame = week.frames[219];
    expect(week.beats.find((b: any) => b.id === "A").frameIndex).toBe(219);
    expect(assess(frame, product, "full").status).toBe("STOP");
    expect(assess(frame, product, "singleStation").status).toBe("GO");
  });
});
