// Sunrise/sunset at the tower and the inversion-timing window. Use when: the engine needs the "inversion likely" hours.
import * as SunCalc from "suncalc";
import { SITE } from "../site";
import { T } from "../thresholds";

const HOUR = 3_600_000;
const PHOENIX_OFFSET_MS = -7 * HOUR; // America/Phoenix has no DST

export interface DayTimes {
  sunriseMs: number;
  sunsetMs: number;
}

const memo = new Map<string, DayTimes>();

/** Sunrise and sunset (epoch ms) for the Phoenix calendar day containing `ms`. Memoized per day. */
export function sunTimesForDay(ms: number): DayTimes {
  const key = new Date(ms + PHOENIX_OFFSET_MS).toISOString().slice(0, 10);
  let v = memo.get(key);
  if (!v) {
    const noonLocal = new Date(`${key}T12:00:00-07:00`);
    const t = SunCalc.getTimes(noonLocal, SITE.tower.lat, SITE.tower.lon);
    v = { sunriseMs: (t.sunrise as Date).getTime(), sunsetMs: (t.sunset as Date).getTime() };
    memo.set(key, v);
  }
  return v;
}

/** True from (sunset - 3 h) until (next sunrise + 1 h). Use when: applying the Faber 2015 timing hint (cloud checked by caller). */
export function inInversionWindow(ms: number): boolean {
  const today = sunTimesForDay(ms);
  if (ms >= today.sunsetMs - T.timingHint.hoursBeforeSunset * HOUR) return true;
  return ms < today.sunriseMs + T.timingHint.hoursAfterSunrise * HOUR;
}
