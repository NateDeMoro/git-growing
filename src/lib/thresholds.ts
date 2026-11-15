// Every spray/no-spray cutoff with its source. Use when: the engine applies a rule, or the UI shows "Why these limits".
// Boundary rule: a value AT a cutoff gets the stricter status (>= for upper limits, < for lower limits).
import type { SourceRef } from "./contract";

export const SOURCES = {
  track: {
    id: "track",
    short: "AgX track brief",
    title: "AgX HackDay track: Using weather intelligence to prevent pesticide drift in orchards (2026)",
    kind: "guidance",
  },
  battany2017: {
    id: "battany2017",
    short: "Battany 2017",
    title: "Battany, M. Portable towers provide insight on frost characteristics (GiESCO 2017, UC Cooperative Extension)",
    url: "https://ives-openscience.eu/62153/",
    kind: "guidance",
  },
  labelInversion: {
    id: "labelInversion",
    short: "Label: no inversions",
    title: "Standard label language: DO NOT apply during temperature inversions (example: Liberty ULTRA label, 2024)",
    url: "https://cropsandsoils.extension.wisc.edu/files/2024/11/Figure-1-Liberty-ULTRA-Label-2024.pdf",
    kind: "standard",
  },
  labelWind: {
    id: "labelWind",
    short: "Label wind window",
    title: "Label sustained-wind definition: NWS 2-minute average, 3 mph minimum (Liberty ULTRA label, 2024); 10 mph max per track brief, product label governs",
    url: "https://cropsandsoils.extension.wisc.edu/files/2024/11/Figure-1-Liberty-ULTRA-Label-2024.pdf",
    kind: "standard",
  },
  grdc2025: {
    id: "grdc2025",
    short: "GRDC 2025",
    title: "GRDC fact sheet: Practical tips for spraying (Jan 2025), Delta T guidance",
    url: "https://grdc.com.au/resources-and-publications/all-publications/factsheets/2025/practical-tips-for-spraying",
    kind: "guidance",
  },
  stull2011: {
    id: "stull2011",
    short: "Stull 2011",
    title: "Stull, R. Wet-bulb temperature from relative humidity and air temperature. J. Appl. Meteor. Climatol. 50:2267 (2011)",
    kind: "standard",
  },
  ppdb: {
    id: "ppdb",
    short: "PPDB/EFSA",
    title: "Univ. of Hertfordshire PPDB background doc: vapour pressure bands <5 low, 5-10 moderate, >10 mPa high (citing EFSA Journal 2014;12(10):3874)",
    url: "https://sitem.herts.ac.uk/aeru/iupac/docs/5_1.pdf",
    kind: "standard",
  },
  faber2015: {
    id: "faber2015",
    short: "UC ANR 2015",
    title: "Faber, B. Surface inversions cause spray drift. UC ANR Topics in Subtropics (2015)",
    url: "https://ucanr.edu/blog/topics-subtropics/article/surface-inversions-cause-spray-drift",
    kind: "guidance",
  },
  amsRain: {
    id: "amsRain",
    short: "AMS Glossary",
    title: "AMS Glossary of Meteorology, Rain: light <=0.10, moderate 0.11-0.30, heavy >0.30 in/hr",
    url: "https://glossary.ametsoc.org/wiki/Rain",
    kind: "standard",
  },
  presfr: {
    id: "presfr",
    short: "NWS PRESFR",
    title: "NWS Federal Meteorological Handbook No. 1 / AFMAN 15-111: pressure falling rapidly at >= 0.06 inHg (about 2.0 hPa) per hour",
    kind: "standard",
  },
  asabe: {
    id: "asabe",
    short: "ASABE S572.3",
    title: "ANSI/ASABE S572.3 (Feb 2020): Spray nozzle classification by droplet spectra",
    url: "https://webstore.ansi.org/preview-pages/ASABE/preview_ANSI+ASABE+S572.3+FEB2020.pdf",
    kind: "standard",
  },
  epaVolatility: {
    id: "epaVolatility",
    short: "EPA drift guidance",
    title: "US EPA: Reducing pesticide drift (vapor drift from volatile products after application)",
    url: "https://www.epa.gov/reducing-pesticide-drift",
    kind: "guidance",
  },
  purdue2018: {
    id: "purdue2018",
    short: "Purdue 2018",
    title: "Johnson, Ikley, Hager, Loux. Dicamba use in soybean: general information. Purdue Pest&Crop 2018.27 (Nov 2018): do not apply on days when wind gusts exceed 10 mph",
    url: "https://extension.entm.purdue.edu/newsletters/pestandcrop/article/dicamba-use-in-soybean-general-information",
    kind: "guidance",
  },
  ucIpmChecklist: {
    id: "ucIpmChecklist",
    short: "UC IPM checklist",
    title: "UC IPM almond pesticide application checklist: avoid spraying in wind under 3 or over 10 mph and just prior to rain or irrigation",
    url: "https://ipm.ucanr.edu/agriculture/almond/pesticide-application-checklist/",
    kind: "guidance",
  },
  ndaPrecip: {
    id: "ndaPrecip",
    short: "Nebraska Dept. of Agriculture",
    title: "Nebraska Dept. of Agriculture: Using precipitation forecasts to comply with product labels (Apr 2024); labels say avoid spraying when rain is forecast, use NWS probability of precipitation",
    url: "https://nda.nebraska.gov/pesticide/Using%20Precipitation%20Forecasts%20to%20Comply%20with%20Product%20Labels.pdf",
    kind: "guidance",
  },
  heuristic: {
    id: "heuristic",
    short: "Our choice (tunable)",
    title: "Team heuristic: no published cutoff found; tunable in thresholds.ts",
    kind: "heuristic",
  },
} satisfies Record<string, SourceRef>;

export const T = {
  inversion: { stopF: 1.8, cautionAboveF: 0 },
  wind: { minMph: 3, defaultMaxMph: 10, nearMaxMarginMph: 2 },
  gust: { stopOverMaxMph: 10 },
  speedShear: { cautionMph: 5, stopMph: 10 },
  dirShear: { cautionDeg: 45, stopDeg: 90, minSpeedMph: 2 },
  deltaT: { cautionBelowC: 2, cautionFromC: 10, stopAboveC: 12 },
  volatility: { moderateFromMpa: 5, highAboveMpa: 10, vaporWatchHours: 12 },
  timingHint: { hoursBeforeSunset: 3, hoursAfterSunrise: 1, maxCloudPct: 25 },
  rain: { stopAboveInHr: 0.1, probCautionPct: 50 },
  pressure: { fallingRapidlyHpaPerHr: -2.0 },
} as const;

export interface RuleDoc {
  ruleId: string;
  name: string;
  cutoff: string;
  sources: SourceRef[];
}

/** Shown in the "Why these limits" panel. */
export const RULE_DOCS: RuleDoc[] = [
  { ruleId: "inversion", name: "Temperature inversion (30 ft minus 5 ft)", cutoff: ">= 1.8°F (1.0°C) STOP; > 0 CAUTION; any inversion STOP for high-volatility products", sources: [SOURCES.battany2017, SOURCES.labelInversion, SOURCES.track] },
  { ruleId: "windLow", name: "Wind too calm (either height)", cutoff: "< 3 mph CAUTION; STOP with an inversion", sources: [SOURCES.labelWind, SOURCES.track] },
  { ruleId: "windHigh", name: "Wind too strong (either height)", cutoff: ">= label max (default 10 mph) STOP; within 2 mph CAUTION", sources: [SOURCES.track, SOURCES.labelWind, SOURCES.ucIpmChecklist, SOURCES.heuristic] },
  { ruleId: "gust", name: "Gusts", cutoff: "> label max CAUTION (Purdue: no spraying when gusts exceed 10 mph); >= 10 mph over max STOP (our choice)", sources: [SOURCES.purdue2018, SOURCES.heuristic] },
  { ruleId: "speedShear", name: "Wind speed difference between heights", cutoff: ">= 5 mph CAUTION; >= 10 mph STOP", sources: [SOURCES.track, SOURCES.heuristic] },
  { ruleId: "dirShear", name: "Wind direction difference between heights", cutoff: ">= 45° CAUTION; >= 90° STOP (both speeds >= 2 mph)", sources: [SOURCES.track, SOURCES.heuristic] },
  { ruleId: "deltaT", name: "Delta T (evaporation)", cutoff: "< 2°C CAUTION; 10-12°C CAUTION, Very Coarse or larger only; > 12°C STOP", sources: [SOURCES.grdc2025, SOURCES.stull2011] },
  { ruleId: "volatility", name: "Product volatility", cutoff: "PPDB bands; high (> 10 mPa): any inversion STOP, vapor caution if inversion forecast within 12 h", sources: [SOURCES.ppdb, SOURCES.epaVolatility] },
  { ruleId: "timingHint", name: "Inversion-likely hours", cutoff: "3 h before sunset to 1 h after sunrise with cloud <= 25%: CAUTION", sources: [SOURCES.faber2015] },
  { ruleId: "rain", name: "Rain", cutoff: "light (<= 0.10 in/hr) CAUTION; > 0.10 in/hr STOP; > 50% chance in 2 h CAUTION", sources: [SOURCES.amsRain, SOURCES.ucIpmChecklist, SOURCES.ndaPrecip, SOURCES.heuristic] },
  { ruleId: "allClear", name: "All within limits (GO)", cutoff: "summarizes the wind, inversion, Delta T, rain and pressure rules above", sources: [SOURCES.labelWind, SOURCES.battany2017, SOURCES.grdc2025, SOURCES.amsRain, SOURCES.presfr] },
  { ruleId: "pressure", name: "Storm approaching (pressure falling rapidly)", cutoff: "falling >= 2.0 hPa/hr CAUTION", sources: [SOURCES.presfr] },
  { ruleId: "droplet", name: "Droplet size recommendation", cutoff: "finest GO class from the label minimum up; none if every class is STOP", sources: [SOURCES.asabe, SOURCES.grdc2025] },
];
