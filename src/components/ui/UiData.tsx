"use client";
// The ONE seam between the 2D panels and data. Every W4 component reads useUiData(); none touch the engine.
// Use when: a panel needs frame, assessment, station verdict, history, forecast or look-ahead.
// W6: replace the mock driver below with real frames (live poll / week.json playhead) and swap the two stub
// imports (stubAssess, stubForecast) for the real assess() and forecast.ts, then delete the stubs + mock48.json.
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Assessment, Beat, ForecastResult, LogEntry, Product, SceneFrame, Status } from "@/lib/contract";
import { productById } from "@/lib/products";
import { logStore } from "@/lib/log";
import { stubAssess } from "@/lib/stubAssess"; // W6: swap for the real engine assess
import { buildForecast } from "@/lib/stubForecast"; // W6: swap for src/lib/forecast.ts
import { getUiState, uiActions, useUiStore } from "@/lib/uiStore";
import { useFrame } from "@/components/FrameProvider";
import mock from "../../../tests/fixtures/mock48.json"; // W6: swap for public/sim/week.json

const FRAMES = mock.frames as unknown as SceneFrame[];
const BEATS = mock.beats as Beat[];
const LIVE_INDEX = 24;
const HOUR = 3600_000;

export interface HistoryPoint {
  time: string;
  lowerTempF: number;
  upperTempF: number;
  lowerWindMph: number;
  upperWindMph: number;
  inverted: boolean;
  status: Status;
}

export interface UiData {
  frame: SceneFrame;
  assessment: Assessment;
  stationAssessment: Assessment | null;
  azmet: null; // W6 fills the regional AZMet reading
  product: Product;
  productId: string;
  setProductId: (id: string) => void;
  history: HistoryPoint[]; // last 24 sim-hours up to and including now
  forecast: ForecastResult;
  lookAhead: { text: string; status: Status } | null; // sim mode only
}

const Ctx = createContext<UiData | null>(null);

function phoenixIso(ms: number): string {
  return new Date(ms - 7 * HOUR).toISOString().replace("Z", "-07:00");
}
function pt(f: SceneFrame): Pick<HistoryPoint, "lowerTempF" | "upperTempF" | "lowerWindMph" | "upperWindMph"> {
  const lo = f.layers.find((l) => l.heightFt === 5)!;
  const up = f.layers.find((l) => l.heightFt === 30)!;
  return { lowerTempF: lo.tempF, upperTempF: up.tempF, lowerWindMph: lo.windMph, upperWindMph: up.windMph };
}

export function useUiData(): UiData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUiData must be used inside UiDataProvider");
  return v;
}

export function UiDataProvider({ children }: { children: ReactNode }) {
  const { productId, setProductId } = useFrame();
  const product = productById(productId);
  const mode = useUiStore((s) => s.mode);
  const playing = useUiStore((s) => s.playing);
  const playhead = useUiStore((s) => s.playhead);
  const idx = mode === "live" ? LIVE_INDEX : Math.min(FRAMES.length - 1, Math.floor(playhead));

  useEffect(() => {
    uiActions.setPlaybackSource({ frameCount: FRAMES.length, framesPerHour: 1, beats: BEATS });
  }, []);

  // Playback driver (mock). W6 replaces with the week.json driver; keep it writing uiActions.setPlayhead.
  useEffect(() => {
    if (!playing || mode !== "sim") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const s = getUiState();
      const dt = (now - last) / 1000;
      last = now;
      const next = s.playhead + s.speed * s.framesPerHour * dt;
      if (next >= s.frameCount - 1) {
        uiActions.setPlayhead(s.frameCount - 1);
        uiActions.setPlaying(false);
        return;
      }
      uiActions.setPlayhead(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, mode]);

  const assessments = useMemo(() => FRAMES.map((f) => stubAssess(f, product, "full")), [product]);

  const forecast = useMemo(() => {
    const base = new Date(FRAMES[LIVE_INDEX].time).getTime();
    const frames: SceneFrame[] = [];
    const statuses: Status[] = [];
    const tops: (string | undefined)[] = [];
    for (let k = 0; k < 168; k++) {
      const src = (LIVE_INDEX + k) % FRAMES.length;
      frames.push({ ...FRAMES[src], mode: "forecast", time: phoenixIso(base + k * HOUR) });
      statuses.push(assessments[src].status);
      tops.push(assessments[src].reasons[0]?.text);
    }
    return buildForecast(frames, statuses, tops);
  }, [assessments]);

  const value = useMemo<UiData>(() => {
    const frame: SceneFrame = { ...FRAMES[idx], mode: mode === "live" ? "live" : "sim" };
    const history: HistoryPoint[] = [];
    for (let i = Math.max(0, idx - 23); i <= idx; i++) {
      history.push({ time: FRAMES[i].time, ...pt(FRAMES[i]), inverted: FRAMES[i].derived.inversionF > 0, status: assessments[i].status });
    }
    let lookAhead: UiData["lookAhead"] = null;
    if (mode === "sim" && idx + 3 < FRAMES.length) {
      const now = assessments[idx].status;
      const later = assessments[idx + 3];
      const rank = { GO: 0, CAUTION: 1, STOP: 2 };
      if (rank[later.status] > rank[now]) {
        const lf = FRAMES[idx + 3];
        const storm = lf.weather.rainInHr > 0 || lf.weather.pressureTrendHpaPerHr <= -2;
        lookAhead = {
          status: later.status,
          text: `${storm ? "Storm arriving" : "Conditions worsen"} in 3 hours: ${later.status}. ${later.reasons[0]?.text ?? ""}`,
        };
      }
    }
    return {
      frame,
      assessment: assessments[idx],
      stationAssessment: stubAssess(frame, product, "singleStation"),
      azmet: null,
      product,
      productId,
      setProductId,
      history,
      forecast,
      lookAhead,
    };
  }, [idx, mode, assessments, product, productId, setProductId, forecast]);

  // Log: on each new frame while playing, and on any status change.
  const prev = useRef<{ idx: number; status: Status } | null>(null);
  useEffect(() => {
    const p = prev.current;
    const status = value.assessment.status;
    const changed = !p || p.status !== status;
    const advanced = !p || p.idx !== idx;
    prev.current = { idx, status };
    if (!(changed || (advanced && playing))) return;
    const f = value.frame;
    const lo = f.layers.find((l) => l.heightFt === 5)!;
    const up = f.layers.find((l) => l.heightFt === 30)!;
    const entry: LogEntry = {
      time: f.time,
      loggedAt: new Date().toISOString(),
      mode: f.mode,
      status,
      statusChanged: !!p && p.status !== status,
      productId,
      recommendedDroplet: value.assessment.recommendedDroplet,
      triggers: value.assessment.reasons.map((r) => r.text),
      lowerTempF: lo.tempF,
      upperTempF: up.tempF,
      lowerWindMph: lo.windMph,
      upperWindMph: up.windMph,
      lowerDirDeg: lo.windDirDeg,
      upperDirDeg: up.windDirDeg,
      deltaTC: f.derived.deltaTC,
      rainInHr: f.weather.rainInHr,
    };
    logStore.append(entry);
  }, [value, idx, playing, productId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
