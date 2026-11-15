// Shared types for every piece (data, engine, sim, forecast, 2D UI, 3D scene).
// Use when: reading or producing frames, assessments, products, log entries or forecast windows.
// Rule: fields may be ADDED only, never renamed or removed. Ask the coordinator to add fields.

export type Status = "GO" | "CAUTION" | "STOP";

export type SourceKind = "standard" | "guidance" | "heuristic";

export interface SourceRef {
  id: string; // e.g. "battany2017"
  short: string; // shown in reasons, e.g. "Battany 2017"
  title: string;
  url?: string;
  kind: SourceKind;
}

/** One horizontal air layer at a height above ground. */
export interface Layer {
  heightFt: number;
  tempF: number;
  windMph: number; // 2-minute average
  windDirDeg: number; // meteorological: direction wind comes FROM, 0 = north
}

/** Summary values derived from the tower (5 ft lower, 30 ft upper). */
export interface Derived {
  inversionF: number; // upper minus lower temp; > 0 = inversion
  speedShearMph: number; // |upper - lower| speed
  dirShearDeg: number; // smallest angle between directions, 0-180
  deltaTC: number; // dry bulb minus wet bulb at 5 ft, deg C
  rhPct: number; // relative humidity at 5 ft
}

export interface Sun {
  elevationDeg: number;
  isDay: boolean;
  sunriseIso: string;
  sunsetIso: string;
}

export interface Weather {
  cloudPct: number;
  rainInHr: number; // current rain rate, in/hr
  rainProbNext2hPct: number; // max precip probability in the next 2 hours
  gustMph: number;
  pressureHpa: number;
  pressureTrendHpaPerHr: number; // negative = falling
}

export interface DriftVector {
  towardDeg: number; // bearing drift travels toward
  strength: number; // 0..1, presentation only
}

export type FrameMode = "live" | "sim" | "forecast";

export interface LookAhead {
  nextBeatId?: string;
  nextBeatFrameIndex?: number;
  frameIndexPlus3h?: number; // sim only; status at that frame is computed at runtime
}

/** The one data shape every view reads. */
export interface SceneFrame {
  time: string; // ISO with offset, America/Phoenix
  mode: FrameMode;
  tower: { lowerFt: 5; upperFt: 30 };
  layers: Layer[]; // ascending by heightFt; includes 5 and 30
  derived: Derived;
  sun: Sun;
  weather: Weather;
  drift: DriftVector;
  /** Context the engine needs beyond this instant. */
  context: {
    inversionForecastNext12h: boolean;
  };
  lookAhead?: LookAhead;
  frameIndex?: number; // sim only
  beatId?: string; // sim only: set on the first frame of a beat
  source?: string; // e.g. "open-meteo", "snapshot", "simulated"
  cached?: boolean; // true when served from a committed snapshot
}

export type DropletClass = "XF" | "VF" | "F" | "M" | "C" | "VC" | "XC" | "UC";

export type VolatilityBand = "low" | "moderate" | "high";

export interface Product {
  id: string;
  name: string; // active ingredient, e.g. "Abamectin"
  pubchemCid?: number;
  vaporPressureMpa: number; // ~25 C
  volatility: VolatilityBand;
  labelWindMaxMph: number; // illustrative, "check label"
  labelMinDroplet: DropletClass;
  note?: string;
  isHighVolatilityExample?: boolean;
}

export interface Reason {
  ruleId: string;
  status: Status;
  text: string; // plain language with real numbers
  source: SourceRef;
}

export type AssessMode = "full" | "singleStation";

export interface Assessment {
  status: Status; // status at the recommended droplet class, or STOP when none works
  reasons: Reason[]; // worst first
  recommendedDroplet: DropletClass | null; // null = no droplet size makes this safe
  dropletNote: string; // e.g. "Use Coarse or larger (air-induction nozzles or lower pressure)"
  perClass?: Partial<Record<DropletClass, Status>>;
  mode: AssessMode;
}

export interface Beat {
  id: "A" | "B" | "C" | "D" | "E" | "F";
  label: string;
  frameIndex: number; // demo landing frame
  startFrameIndex?: number;
  peakFrameIndex?: number;
  description?: string;
}

export interface SimWeek {
  generatedFrom: string; // e.g. "open-meteo historical 2026-11-03..09"
  stepMinutes: 5;
  beats: Beat[];
  frames: SceneFrame[];
  meta?: {
    sourceWeek: { start: string; end: string };
    seed: number;
    calibrationK: number;
    site: { lat: number; lon: number };
    note: string;
  };
}

export interface LogEntry {
  time: string; // frame time (ISO)
  loggedAt: string; // wall clock (ISO)
  mode: FrameMode;
  status: Status;
  statusChanged: boolean;
  productId: string;
  recommendedDroplet: DropletClass | null;
  nozzle?: string; // top nozzle choice for the droplet class (empty when no chart supports it)
  triggers: string[]; // reason texts, worst first
  lowerTempF: number;
  upperTempF: number;
  lowerWindMph: number;
  upperWindMph: number;
  lowerDirDeg: number;
  upperDirDeg: number;
  deltaTC: number;
  rainInHr: number;
}

export interface ForecastWindow {
  start: string;
  end: string; // exclusive
  status: Status;
  topReason?: string;
}

export interface ForecastResult {
  frames: SceneFrame[];
  windows: ForecastWindow[];
  nextSafeWindow: ForecastWindow | null; // GO, >= 2 hours
  earlyWarning: { at: string; status: Status; reason: string; hours?: number; storm?: boolean } | null; // within 6 h
  nws?: { time: string; mixingHeightFt?: number; transportWindMph?: number }[];
  source: string;
  cached: boolean;
}

export interface Block {
  id: string;
  name: string; // "Block A"
  polygon: [number, number][]; // [lon, lat]
  rowBearingDeg: number;
  acres?: number;
}

export interface Site {
  name: string;
  address: string;
  crop: string;
  timezone: "America/Phoenix";
  tower: { lat: number; lon: number };
  farmOutline: [number, number][]; // [lon, lat]
  blocks: Block[];
  defaultBlockId: string;
  azmetStationId: string;
}
