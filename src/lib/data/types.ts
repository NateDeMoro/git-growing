// W1-internal normalized data shapes (metric). Use when: consuming adapter output (derive, API routes, calibration).

/** One hour of model data at the tower point. Metric units. Heights above ground. */
export interface HourlyRecord {
  time: string; // local America/Phoenix, "YYYY-MM-DDTHH:00"
  temp2mC: number | null;
  temp80mC: number | null;
  temp120mC: number | null;
  temp180mC: number | null; // null for the last ~6 h of the forecast
  wind10mKmh: number | null;
  wind80mKmh: number | null;
  wind120mKmh: number | null;
  wind180mKmh: number | null;
  windDir10mDeg: number | null;
  windDir80mDeg: number | null;
  windDir120mDeg: number | null;
  windDir180mDeg: number | null;
  gust10mKmh: number | null;
  rhPct: number | null;
  dewPointC: number | null;
  cloudPct: number | null;
  precipMm: number | null;
  precipProbPct: number | null;
  pressureHpa: number | null;
  boundaryLayerM: number | null;
  isDay: boolean | null;
}

/** NWS gridpoint context, hourly. Not a rule input. */
export interface NwsHour {
  time: string; // local America/Phoenix, "YYYY-MM-DDTHH:00"
  mixingHeightM: number | null;
  transportWindKmh: number | null;
  transportWindDirDeg: number | null;
  twentyFootWindKmh: number | null;
}

/** Latest AZMet hourly reading, normalized to metric plus the original mph/F values. */
export interface StationReading {
  stationId: string;
  stationName: string;
  time: string; // local "YYYY-MM-DDTHH:00" (hour ending)
  tempC: number | null;
  tempF: number | null;
  rhPct: number | null;
  dewPointC: number | null;
  windMph: number | null;
  windKmh: number | null;
  windDirDeg: number | null;
  gustMph: number | null;
  gustKmh: number | null;
  precipMm: number | null;
}

export type SourceFlag = "live" | "snapshot";

/** Envelope on every API response. `source` feeds the "cached data" chip. */
export interface ApiEnvelope<T> {
  data: T;
  dataTime: string; // ISO timestamp of the data (fetch time for live, snapshot time for snapshot)
  sources: string[];
  source: SourceFlag;
  stale?: boolean; // snapshot time range does not cover now
}

export interface SnapshotFile<T> {
  fetchedAt: string; // ISO
  lat: number;
  lon: number;
  sources: string[];
  data: T;
}
