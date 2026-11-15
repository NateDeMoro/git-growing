"use client";
// The ONE seam between the 2D panels / 3D slot and data. Every panel reads useUiData(); none touch the engine.
// Use when: a panel needs frame, assessment, station verdict, history, forecast, look-ahead or the cached flag.
// Live: polls /api/now every 60 s (frames already derived server-side). Simulate: /sim/week.json (static, zero API calls),
// 5-minute frames, playhead driven here at 0.25 / 1 / 6 sim-hours per second. Assessment runs client-side, memoized.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Assessment, Beat, ForecastResult, Product, SceneFrame, SimWeek, Status } from "@/lib/contract";
import type { StationReading } from "@/lib/data/types";
import { assess } from "@/lib/engine/assess";
import { cachedAssess } from "@/lib/assessCache";
import { buildForecast } from "@/lib/forecast";
import { logStore } from "@/lib/log";
import { productById } from "@/lib/products";
import { FRAMES_PER_HOUR, createSimLogger, makeLogEntry } from "@/lib/simLogger";
import { stationFrame } from "@/lib/stationFrame";
import { getUiState, registerUiCallbacks, uiActions, useUiStore } from "@/lib/uiStore";
import { useFrame } from "@/components/FrameProvider";

const RANK: Record<Status, number> = { GO: 0, CAUTION: 1, STOP: 2 };
const POLL_MS = 60_000;
const HISTORY_STEP = 6; // downsample 5-minute frames to 30-minute chart points
const HISTORY_POINTS = 48; // 24 h

export interface HistoryPoint {
  time: string;
  lowerTempF: number;
  upperTempF: number;
  lowerWindMph: number;
  upperWindMph: number;
  inverted: boolean;
  status: Status;
}

export interface AzmetCompare {
  reading: StationReading;
  assessment: Assessment; // single-station mode on the AZMet reading
  cached: boolean;
}

export interface UiData {
  frame: SceneFrame;
  assessment: Assessment;
  stationAssessment: Assessment | null; // our 5 ft data, single-station mode
  azmet: AzmetCompare | null; // live mode only
  product: Product;
  productId: string;
  setProductId: (id: string) => void;
  history: HistoryPoint[]; // last 24 h up to now, 30-minute points
  forecast: ForecastResult;
  lookAhead: { text: string; status: Status } | null; // sim mode only
  cached: boolean; // live frame or AZMet came from a committed snapshot
  forecastFailed: boolean; // /api/forecast failed: forecast shows the sim week instead
  notice: string | null; // brief message (e.g. Live unavailable, back in Simulate)
  loadForecast: () => void; // Use when: the Forecast tab opens (fetches /api/forecast once)
}

const Ctx = createContext<UiData | null>(null);

const EMPTY_FORECAST: ForecastResult = { frames: [], windows: [], nextSafeWindow: null, earlyWarning: null, source: "loading", cached: false };

function pt(f: SceneFrame): Pick<HistoryPoint, "lowerTempF" | "upperTempF" | "lowerWindMph" | "upperWindMph"> {
  const lo = f.layers.find((l) => l.heightFt === 5)!;
  const up = f.layers.find((l) => l.heightFt === 30)!;
  return { lowerTempF: lo.tempF, upperTempF: up.tempF, lowerWindMph: lo.windMph, upperWindMph: up.windMph };
}

/** First of the next 3 sim-hours whose status is worse than now. Use when: building the early-warning text. */
function computeLookAhead(frames: SceneFrame[], idx: number, now: Status, assessAt: (i: number) => Assessment): UiData["lookAhead"] {
  for (let h = 1; h <= 3; h++) {
    const j = idx + h * FRAMES_PER_HOUR;
    if (j >= frames.length) break;
    const later = assessAt(j);
    if (RANK[later.status] > RANK[now]) {
      const lf = frames[j];
      const storm = lf.weather.rainInHr > 0 || lf.weather.pressureTrendHpaPerHr <= -2;
      return {
        status: later.status,
        text: `${storm ? "Storm arriving" : "Conditions worsen"} in ${h} hour${h > 1 ? "s" : ""}: ${later.status}. ${later.reasons[0]?.text ?? ""}`,
      };
    }
  }
  return null;
}

export function useUiData(): UiData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUiData must be used inside UiDataProvider");
  return v;
}

interface LiveRes { frame: SceneFrame; cached: boolean; seq: number; at: number }
interface ForecastRaw { frames: SceneFrame[]; nowIndex: number; nws: ForecastResult["nws"]; source: string; cached: boolean }
interface StationRes { reading: StationReading; cached: boolean }

export function UiDataProvider({ children }: { children: ReactNode }) {
  const { productId, setProductId } = useFrame();
  const product = productById(productId);
  const mode = useUiStore((s) => s.mode);
  const playing = useUiStore((s) => s.playing);
  const playheadIdx = useUiStore((s) => Math.floor(s.playhead));

  const [week, setWeek] = useState<SimWeek | null>(null);
  const [liveRes, setLiveRes] = useState<LiveRes | null>(null);
  const [stationRes, setStationRes] = useState<StationRes | null>(null);
  const [fcRaw, setFcRaw] = useState<ForecastRaw | null>(null);
  const [wantForecast, setWantForecast] = useState(false);
  const [fcFailed, setFcFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const seq = useRef(0);
  const frames = week?.frames;
  const idx = frames ? Math.min(frames.length - 1, Math.max(0, playheadIdx)) : 0;

  const loadForecast = useCallback(() => setWantForecast(true), []);

  // Load the sim week once (static file) and tell the store its length and beats.
  useEffect(() => {
    let dead = false;
    fetch("/sim/week.json")
      .then((r) => r.json() as Promise<SimWeek>)
      .then((w) => {
        if (dead) return;
        setWeek(w);
        uiActions.setPlaybackSource({ frameCount: w.frames.length, framesPerHour: FRAMES_PER_HOUR, beats: w.beats as Beat[] });
      })
      .catch(() => {});
    return () => { dead = true; };
  }, []);

  const pollLive = useCallback(async (first = false): Promise<boolean> => {
    try {
      const r = await fetch("/api/now", { signal: AbortSignal.timeout(first ? 3000 : 5000) });
      if (!r.ok) return false;
      const j = await r.json();
      setLiveRes({ frame: j.frame as SceneFrame, cached: !!j.cached, seq: ++seq.current, at: Date.now() });
      fetch("/api/station", { signal: AbortSignal.timeout(5000) }).then((s) => s.json()).then((s) => setStationRes({ reading: s.data, cached: s.source === "snapshot" })).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }, []);

  // First load: try Live; stay in Simulate if the live fetch fails.
  useEffect(() => {
    pollLive(true).then((ok) => {
      const s = getUiState();
      // Auto-flip only if the user has not touched anything yet.
      if (ok && s.mode === "sim" && !s.playing && Math.floor(s.playhead) === 0 && s.speed === 1) uiActions.setMode("live");
    });
  }, [pollLive]);

  // Live polling every 60 s while in Live mode.
  useEffect(() => {
    if (mode !== "live") return;
    let t = 0;
    let first = true;
    const run = async () => {
      const ok = await pollLive(first);
      if (!ok && first) {
        // Live unreachable on entry: do not show a stale frame, go back to Simulate.
        setNotice("Live data unavailable, showing Simulate.");
        window.setTimeout(() => setNotice(null), 5000);
        uiActions.setMode("sim");
      }
      first = false;
    };
    const recent = liveRes && Date.now() - liveRes.at < 5000;
    if (!recent) run();
    t = window.setInterval(run, POLL_MS);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pollLive]);

  // Forecast data (fetched on demand so Simulate stays offline).
  useEffect(() => {
    if ((!wantForecast && mode !== "live") || fcRaw) return;
    fetch("/api/forecast", { signal: AbortSignal.timeout(8000) }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("forecast")))).then((j) => {
      setFcRaw({ frames: j.frames, nowIndex: j.nowIndex ?? 0, nws: j.nws, source: j.source, cached: !!j.cached });
    }).catch(() => setFcFailed(true));
  }, [wantForecast, mode, fcRaw]);

  // Sim playhead driver. Store writes are throttled to ~30 per second; frame scanning for the log is in the logger.
  useEffect(() => {
    if (!playing || mode !== "sim" || !week) return;
    let raf = 0;
    let last = performance.now();
    let lastWrite = 0;
    let pos = getUiState().playhead;
    let written = pos;
    const tick = (now: number) => {
      const s = getUiState();
      if (s.playhead !== written) { pos = s.playhead; written = pos; }
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      pos += s.speed * s.framesPerHour * dt;
      if (pos >= s.frameCount - 1) {
        uiActions.setPlayhead(s.frameCount - 1);
        uiActions.setPlaying(false);
        return;
      }
      if (now - lastWrite >= 33) {
        lastWrite = now;
        uiActions.setPlayhead(pos);
        written = getUiState().playhead;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, mode, week]);

  const assessAt = useCallback(
    (i: number) => cachedAssess(frames![i], product, "full", frames![i].time),
    [frames, product],
  );

  // Sim logging: scans every frame between playheads. Recreated per product/mode so state never lags.
  const logger = useRef<ReturnType<typeof createSimLogger> | null>(null);
  const prevSim = useRef<{ productId: string; status: Status } | null>(null);
  useEffect(() => {
    logger.current = null;
    if (mode !== "sim" || !frames) { prevSim.current = null; return; }
    const lg = createSimLogger({ frameAt: (i) => frames[i], assessAt, productId, append: logStore.append });
    logger.current = lg;
    const at = Math.min(frames.length - 1, Math.floor(getUiState().playhead));
    const prev = prevSim.current;
    if (prev && prev.productId !== productId) lg.switchProduct(at, prev.status);
    else lg.update(at);
    prevSim.current = { productId, status: assessAt(at).status };
  }, [mode, frames, assessAt, productId]);
  useEffect(() => {
    if (mode !== "sim") return;
    logger.current?.update(idx);
    if (frames) prevSim.current = { productId, status: assessAt(idx).status };
  }, [idx, mode, frames, assessAt, productId]);
  useEffect(() => registerUiCallbacks({ clearLog: () => logger.current?.reset() }), []);

  // Current frame + assessments.
  const simFrame = frames ? frames[idx] : null;
  const frame = mode === "live" ? liveRes?.frame ?? simFrame : simFrame;

  const assessment = useMemo(() => {
    if (!frame) return null;
    return mode === "live" && liveRes?.frame === frame ? assess(frame, product, "full") : cachedAssess(frame, product, "full", frame.time);
  }, [frame, mode, liveRes, product]);
  const stationAssessment = useMemo(() => {
    if (!frame) return null;
    return mode === "live" && liveRes?.frame === frame ? assess(frame, product, "singleStation") : cachedAssess(frame, product, "singleStation", frame.time);
  }, [frame, mode, liveRes, product]);

  // Live logging: once per poll, plus on status change (e.g. product switch).
  const liveLog = useRef<{ seq: number; status: Status } | null>(null);
  useEffect(() => {
    if (mode !== "live" || !liveRes || !assessment || frame !== liveRes.frame) { if (mode !== "live") liveLog.current = null; return; }
    const prev = liveLog.current;
    const changed = !!prev && prev.status !== assessment.status;
    if (!prev || prev.seq !== liveRes.seq || changed) logStore.append(makeLogEntry(frame, assessment, productId, changed));
    liveLog.current = { seq: liveRes.seq, status: assessment.status };
  }, [mode, liveRes, assessment, frame, productId]);

  const azmet = useMemo<AzmetCompare | null>(() => {
    if (mode !== "live" || !stationRes || !frame) return null;
    return { reading: stationRes.reading, cached: stationRes.cached, assessment: assess(stationFrame(stationRes.reading, frame), product, "singleStation") };
  }, [mode, stationRes, frame, product]);

  const hourBucket = Math.floor(idx / FRAMES_PER_HOUR);
  const forecast = useMemo<ForecastResult>(() => {
    if (fcRaw) return buildForecast(fcRaw.frames, product, { nowIndex: fcRaw.nowIndex, nws: fcRaw.nws, source: fcRaw.source, cached: fcRaw.cached });
    if (fcFailed && frames) {
      // Fallback: hourly samples of the sim week from the current playhead, labelled as simulated.
      const hourly: SceneFrame[] = [];
      for (let i = hourBucket * FRAMES_PER_HOUR; i < frames.length && hourly.length < 168; i += FRAMES_PER_HOUR) hourly.push({ ...frames[i], mode: "forecast" });
      return buildForecast(hourly, product, { source: "simulated", cached: true });
    }
    return EMPTY_FORECAST;
  }, [fcRaw, fcFailed, frames, hourBucket, product]);

  // 24 h history, 30-minute points anchored to the frame grid so the line does not jitter.
  const bucket = Math.floor(idx / HISTORY_STEP);
  const history = useMemo<HistoryPoint[]>(() => {
    if (mode === "sim" && frames) {
      const out: HistoryPoint[] = [];
      for (let k = HISTORY_POINTS - 1; k >= 0; k--) {
        const i = (bucket - k) * HISTORY_STEP;
        if (i < 0) continue;
        out.push({ time: frames[i].time, ...pt(frames[i]), inverted: frames[i].derived.inversionF > 0, status: assessAt(i).status });
      }
      return out;
    }
    if (fcRaw) {
      const out: HistoryPoint[] = [];
      for (let i = Math.max(0, fcRaw.nowIndex - 23); i <= fcRaw.nowIndex; i++) {
        const f = fcRaw.frames[i];
        out.push({ time: f.time, ...pt(f), inverted: f.derived.inversionF > 0, status: assess(f, product, "full").status });
      }
      return out;
    }
    return frame ? [{ time: frame.time, ...pt(frame), inverted: frame.derived.inversionF > 0, status: assessment!.status }] : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, frames, bucket, assessAt, fcRaw, product]);

  // Look-ahead: first of the next 3 sim-hours whose status is worse than now.
  const nowStatus = assessment?.status;
  const lookAhead = useMemo(
    () => (mode === "sim" && frames && nowStatus ? computeLookAhead(frames, idx, nowStatus, assessAt) : null),
    [mode, frames, idx, nowStatus, assessAt],
  );

  const cached = mode === "live" && ((liveRes?.cached ?? false) || (stationRes?.cached ?? false));

  const value = useMemo<UiData | null>(
    () =>
      frame && assessment
        ? { frame, assessment, stationAssessment, azmet, product, productId, setProductId, history, forecast, lookAhead, cached, forecastFailed: fcFailed, notice, loadForecast }
        : null,
    [frame, assessment, stationAssessment, azmet, product, productId, setProductId, history, forecast, lookAhead, cached, fcFailed, notice, loadForecast],
  );

  if (!value) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Loading simulation data...</div>;
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
