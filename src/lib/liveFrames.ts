// Client-side adapters from API records (W1 shapes) to SceneFrames. Use when: turning /api/now, /api/forecast or
// /api/station payloads into frames the engine can assess. Pure: no network, no clock.
import type { SceneFrame } from "./contract";
import type { HourlyRecord as ApiHour, NwsHour, StationReading } from "./data/types";
import { deriveFrame, wetBulbC, type Calibration, type HourlyRecord as DeriveHour } from "./derive";
import { T } from "./thresholds";
import calibration from "../../data/calibration.json";

const CAL = calibration as unknown as Calibration;

/** Use when: one API hour needs the derive-module shape. Missing readings fall back to the nearest height. */
export function toDeriveHour(r: ApiHour, prev?: ApiHour, next1?: ApiHour, next2?: ApiHour): DeriveHour {
  const t2 = r.temp2mC ?? 20;
  const ws10 = r.wind10mKmh ?? 0;
  const probs = [r, next1, next2].map((x) => x?.precipProbPct ?? 0);
  return {
    time: r.time,
    t2mC: t2,
    t80mC: r.temp80mC ?? t2,
    ws10Kmh: ws10,
    ws80Kmh: r.wind80mKmh ?? ws10,
    wd10Deg: r.windDir10mDeg ?? 0,
    wd80Deg: r.windDir80mDeg ?? r.windDir10mDeg ?? 0,
    rhPct: r.rhPct ?? 40,
    cloudPct: r.cloudPct ?? 0,
    precipMm: r.precipMm ?? 0,
    gustKmh: r.gust10mKmh ?? ws10 * 1.3,
    pressureHpa: r.pressureHpa ?? 1013,
    pressureTrendHpaPerHr: prev && prev.pressureHpa !== null && r.pressureHpa !== null ? r.pressureHpa - prev.pressureHpa : 0,
    rainProbNext2hPct: Math.max(...probs),
  };
}

/**
 * Use when: deriving frames for a run of consecutive hours. Flags inversionForecastNext12h from the derived frames.
 */
export function framesFromHourly(records: ApiHour[], mode: SceneFrame["mode"], source: string, cached: boolean): SceneFrame[] {
  const frames = records.map((r, i) =>
    deriveFrame(toDeriveHour(r, records[i - 1], records[i + 1], records[i + 2]), CAL, { mode, source }),
  );
  frames.forEach((f, i) => {
    f.cached = cached;
    for (let k = i + 1; k <= i + 12 && k < frames.length; k++) {
      if (frames[k].derived.inversionF >= T.inversion.stopF) {
        f.context = { ...f.context, inversionForecastNext12h: true };
        break;
      }
    }
  });
  return frames;
}

/** Use when: /api/now returns one record. Neighbours (from /api/forecast, if loaded) give trend and context. */
export function liveFrame(rec: ApiHour, hourly: ApiHour[] | null, source: string, cached: boolean): SceneFrame {
  const i = hourly ? hourly.findIndex((h) => h.time === rec.time) : -1;
  if (!hourly || i < 0) return framesFromHourly([rec], "live", source, cached)[0];
  const recs = hourly.slice(Math.max(0, i - 1), i + 14).map((h) => (h.time === rec.time ? rec : h));
  const frames = framesFromHourly(recs, "live", source, cached);
  return frames[i === 0 ? 0 : 1];
}

/** Use when: a regional AZMet reading must go through single-station mode. Takes sun, cloud and pressure from `base`. */
export function stationFrame(s: StationReading, base: SceneFrame): SceneFrame {
  const tempC = s.tempC ?? ((s.tempF ?? 70) - 32) * (5 / 9);
  const tempF = s.tempF ?? tempC * 1.8 + 32;
  const rh = s.rhPct ?? base.derived.rhPct;
  return {
    ...base,
    time: base.time,
    layers: [{ heightFt: 5, tempF, windMph: s.windMph ?? 0, windDirDeg: s.windDirDeg ?? 0 }],
    derived: { inversionF: 0, speedShearMph: 0, dirShearDeg: 0, deltaTC: Math.max(0, tempC - wetBulbC(tempC, rh)), rhPct: rh },
    weather: {
      ...base.weather,
      rainInHr: (s.precipMm ?? 0) / 25.4,
      gustMph: s.gustMph ?? s.windMph ?? 0,
    },
    context: { inversionForecastNext12h: false },
  };
}

/** Use when: the forecast chart or ForecastResult needs the NWS context in UI units. */
export function nwsOverlay(nws: NwsHour[]): { time: string; mixingHeightFt?: number; transportWindMph?: number }[] {
  return nws.map((n) => ({
    time: n.time,
    mixingHeightFt: n.mixingHeightM === null ? undefined : n.mixingHeightM * 3.28084,
    transportWindMph: n.transportWindKmh === null ? undefined : n.transportWindKmh * 0.621371,
  }));
}

