// A hand-made frame for building UI before real data lands. Use when: a component needs a frame in dev or tests.
import type { Assessment, SceneFrame } from "./contract";
import { SOURCES } from "./thresholds";

export const MOCK_FRAME: SceneFrame = {
  time: "2026-11-15T18:30:00-07:00",
  mode: "sim",
  tower: { lowerFt: 5, upperFt: 30 },
  layers: [
    { heightFt: 5, tempF: 62.0, windMph: 4.5, windDirDeg: 320 },
    { heightFt: 15, tempF: 63.4, windMph: 5.2, windDirDeg: 330 },
    { heightFt: 30, tempF: 65.1, windMph: 6.8, windDirDeg: 345 },
    { heightFt: 60, tempF: 66.0, windMph: 8.5, windDirDeg: 0 },
    { heightFt: 100, tempF: 66.2, windMph: 10.1, windDirDeg: 10 },
    { heightFt: 160, tempF: 65.8, windMph: 11.4, windDirDeg: 15 },
    { heightFt: 260, tempF: 65.0, windMph: 12.6, windDirDeg: 20 },
  ],
  derived: { inversionF: 3.1, speedShearMph: 2.3, dirShearDeg: 25, deltaTC: 4.2, rhPct: 48 },
  sun: { elevationDeg: -4, isDay: false, sunriseIso: "2026-11-15T06:58:00-07:00", sunsetIso: "2026-11-15T17:33:00-07:00" },
  weather: { cloudPct: 35, rainInHr: 0, rainProbNext2hPct: 0, gustMph: 7, pressureHpa: 1015, pressureTrendHpaPerHr: 0 },
  drift: { towardDeg: 165, strength: 0.7 },
  context: { inversionForecastNext12h: true },
  source: "mock",
};

export const MOCK_ASSESSMENT: Assessment = {
  status: "STOP",
  reasons: [
    {
      ruleId: "inversion",
      status: "STOP",
      text: "It is 3.1°F warmer at 30 ft than at 5 ft: a temperature inversion is trapping spray near the ground.",
      source: SOURCES.battany2017,
    },
  ],
  recommendedDroplet: null,
  dropletNote: "No droplet size makes this safe: the inversion traps spray of any size.",
  mode: "full",
};
