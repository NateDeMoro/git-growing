import { describe, expect, it } from "vitest";
import { assess } from "@/lib/engine/assess";
import { MOCK_FRAME } from "@/lib/mockFrame";
import { PRODUCTS } from "@/lib/products";
import { RULE_DOCS, T } from "@/lib/thresholds";
import { dropletIndex } from "@/lib/droplets";
import type { Product, SceneFrame } from "@/lib/contract";

const lowVol: Product = { ...PRODUCTS[0], labelMinDroplet: "M", labelWindMaxMph: 10 };
const highVol: Product = { ...PRODUCTS.find((p) => p.volatility === "high")!, labelMinDroplet: "M" };
const MAX = 10;

// Midday, calm-clean baseline: all rules GO.
function frame(o: {
  inv?: number; lowWind?: number; upWind?: number; lowDir?: number; upDir?: number;
  gust?: number; rain?: number; rainProb?: number; trend?: number; dt?: number; forecastInv?: boolean;
} = {}): SceneFrame {
  const lowWind = o.lowWind ?? 6, upWind = o.upWind ?? 6;
  const lowDir = o.lowDir ?? 200, upDir = o.upDir ?? 200;
  const dir = Math.abs(lowDir - upDir);
  return {
    ...MOCK_FRAME,
    time: "2026-11-15T12:00:00-07:00",
    layers: [
      { heightFt: 5, tempF: 70, windMph: lowWind, windDirDeg: lowDir },
      { heightFt: 30, tempF: 70 + (o.inv ?? 0), windMph: upWind, windDirDeg: upDir },
    ],
    derived: { inversionF: o.inv ?? 0, speedShearMph: Math.abs(upWind - lowWind), dirShearDeg: dir > 180 ? 360 - dir : dir, deltaTC: o.dt ?? 6, rhPct: 40 },
    weather: {
      cloudPct: 50, rainInHr: o.rain ?? 0, rainProbNext2hPct: o.rainProb ?? 0, gustMph: o.gust ?? 8,
      pressureHpa: 1015, pressureTrendHpaPerHr: o.trend ?? 0,
    },
    context: { inversionForecastNext12h: o.forecastInv ?? false },
  };
}

describe("assess", () => {
  it("baseline is GO", () => {
    expect(assess(frame(), lowVol).status).toBe("GO");
  });

  it("inversion at the STOP cutoff gives STOP, below it gives CAUTION", () => {
    const a = assess(frame({ inv: T.inversion.stopF + 0.2 }), lowVol);
    expect(a.status).toBe("STOP");
    expect(a.recommendedDroplet).toBeNull();
    expect(a.dropletNote).toContain("No droplet size makes this safe");
    expect(assess(frame({ inv: T.inversion.stopF - 0.8 }), lowVol).status).toBe("CAUTION");
  });

  it("wind under the minimum with an inversion gives STOP", () => {
    const a = assess(frame({ inv: 1, lowWind: T.wind.minMph - 1, upWind: T.wind.minMph - 1 }), lowVol);
    expect(a.reasons.find((r) => r.ruleId === "windLow")?.status).toBe("STOP");
    expect(a.status).toBe("STOP");
  });

  it("wind over the label maximum gives STOP", () => {
    const a = assess(frame({ lowWind: MAX + 2, upWind: MAX + 2, gust: MAX + 3 }), lowVol);
    expect(a.reasons.find((r) => r.ruleId === "windHigh")?.status).toBe("STOP");
    expect(a.status).toBe("STOP");
  });

  it("direction shear is ignored in calm air", () => {
    const calm = T.dirShear.minSpeedMph - 1;
    const a = assess(frame({ lowWind: calm, upWind: calm, lowDir: 0, upDir: 120 }), lowVol);
    expect(a.reasons.some((r) => r.ruleId === "dirShear")).toBe(false);
    const b = assess(frame({ lowDir: 0, upDir: 120 }), lowVol);
    expect(b.reasons.find((r) => r.ruleId === "dirShear")?.status).toBe("STOP");
  });

  it("recommends the finest GO class at or above the label minimum", () => {
    const a = assess(frame(), { ...lowVol, labelMinDroplet: "C" });
    expect(a.recommendedDroplet).toBe("C");
    expect(a.status).toBe("GO");
  });

  it("a high-volatility product turns a 1F inversion into STOP", () => {
    const f = frame({ inv: 1 });
    expect(assess(f, lowVol).status).toBe("CAUTION");
    expect(assess(f, highVol).status).toBe("STOP");
  });

  it("forecast-inversion vapor caution applies only to high-volatility products", () => {
    const f = frame({ forecastInv: true });
    expect(assess(f, lowVol).status).toBe("GO");
    expect(assess(f, highVol).reasons.some((r) => r.ruleId === "volatilityForecast")).toBe(true);
  });

  it("single-station mode skips the inversion rule", () => {
    const f = frame({ inv: 3 });
    expect(assess(f, lowVol, "full").status).toBe("STOP");
    const s = assess(f, lowVol, "singleStation");
    expect(s.status).toBe("GO");
    expect(s.mode).toBe("singleStation");
  });

  it("rain over the STOP rate gives STOP", () => {
    const a = assess(frame({ rain: T.rain.stopAboveInHr + 0.05 }), lowVol);
    expect(a.reasons.find((r) => r.ruleId === "rain")?.status).toBe("STOP");
    expect(a.status).toBe("STOP");
  });

  it("gusts far over the maximum give STOP", () => {
    const a = assess(frame({ gust: MAX + T.gust.stopOverMaxMph + 1 }), lowVol);
    expect(a.reasons.find((r) => r.ruleId === "gust")?.status).toBe("STOP");
  });

  it("a rapid pressure fall gives a storm-approaching CAUTION", () => {
    const a = assess(frame({ trend: T.pressure.fallingRapidlyHpaPerHr }), lowVol);
    const r = a.reasons.find((x) => x.ruleId === "pressure");
    expect(r?.status).toBe("CAUTION");
    expect(r?.text).toContain("Storm approaching");
  });

  it("Delta T of 11C gives CAUTION and forces Very Coarse or larger", () => {
    const a = assess(frame({ dt: 11 }), { ...lowVol, labelMinDroplet: "F" });
    expect(a.status).toBe("CAUTION");
    expect(dropletIndex(a.recommendedDroplet!)).toBeGreaterThanOrEqual(dropletIndex("VC"));
  });

  it("worst status wins and reasons sort worst first", () => {
    const a = assess(frame({ rain: 0.05, gust: MAX + 15, trend: -3 }), lowVol);
    expect(a.status).toBe("STOP");
    const rank = { STOP: 2, CAUTION: 1, GO: 0 };
    const ranks = a.reasons.map((r) => rank[r.status]);
    expect(ranks).toEqual([...ranks].sort((x, y) => y - x));
    expect(a.reasons[0].status).toBe("STOP");
  });

  it("every rule in thresholds.ts has a source with a kind and title", () => {
    for (const r of RULE_DOCS) {
      expect(r.sources.length).toBeGreaterThan(0);
      for (const s of r.sources) {
        expect(s.kind).toBeTruthy();
        expect(s.title.length).toBeGreaterThan(5);
      }
    }
  });
});
