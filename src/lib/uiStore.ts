// Small UI store: playback state, demo-panel visibility, charts strip, 2D/3D. Use when: a component or hotkey
// reads/changes playback or UI chrome. W6 backs the playhead with week.json via setPlaybackSource(); W7 registers
// camera callbacks via registerUiCallbacks() (flyOverview, toggle2D3D). All hooks are no-ops until registered.
import { useSyncExternalStore } from "react";
import type { Beat } from "./contract";
import { logStore } from "./log";

export type PlayMode = "live" | "sim";
export type Speed = 0.25 | 1 | 6; // sim-hours per second
export const SPEEDS: Speed[] = [0.25, 1, 6];

export interface UiState {
  mode: PlayMode;
  playing: boolean;
  speed: Speed;
  playhead: number; // frame index (fractional while playing)
  frameCount: number;
  framesPerHour: number;
  beats: Beat[];
  demoPanelOpen: boolean;
  chartsCollapsed: boolean;
  view: "3d" | "2d";
}

let state: UiState = {
  mode: "sim",
  playing: false,
  speed: 1,
  playhead: 0,
  frameCount: 0,
  framesPerHour: 1,
  beats: [],
  demoPanelOpen: false,
  chartsCollapsed: false,
  view: "3d",
};
const listeners = new Set<() => void>();
function set(patch: Partial<UiState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** Optional hooks, called AFTER the store updates. Use when: wiring the 3D camera or the real playback source. */
export interface UiCallbacks {
  jumpToBeat?: (beat: Beat, index: number) => void;
  flyOverview?: () => void;
  toggle2D3D?: (view: "3d" | "2d") => void;
  clearLog?: () => void;
  modeChanged?: (mode: PlayMode) => void;
}
const callbacks: UiCallbacks = {};
export function registerUiCallbacks(cb: UiCallbacks): () => void {
  Object.assign(callbacks, cb);
  return () => {
    for (const k of Object.keys(cb) as (keyof UiCallbacks)[]) delete callbacks[k];
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const uiActions = {
  /** Use when: the playback source (mock now, week.json later) knows its length and beats. */
  setPlaybackSource(src: { frameCount: number; framesPerHour: number; beats: Beat[] }) {
    set({ ...src, playhead: clamp(state.playhead, 0, Math.max(0, src.frameCount - 1)) });
  },
  setMode(mode: PlayMode) {
    set({ mode, playing: mode === "sim" ? state.playing : false });
    callbacks.modeChanged?.(mode);
  },
  toggleMode() {
    uiActions.setMode(state.mode === "live" ? "sim" : "live");
  },
  setPlaying(playing: boolean) {
    set({ playing: playing && state.mode === "sim" });
  },
  togglePlay() {
    if (state.mode === "live") uiActions.setMode("sim");
    set({ playing: !state.playing });
  },
  setSpeed(speed: Speed) {
    set({ speed });
  },
  /** dir +1 faster, -1 slower through 0.25 / 1 / 6. */
  stepSpeed(dir: 1 | -1) {
    const i = clamp(SPEEDS.indexOf(state.speed) + dir, 0, SPEEDS.length - 1);
    set({ speed: SPEEDS[i] });
  },
  setPlayhead(playhead: number) {
    set({ playhead: clamp(playhead, 0, Math.max(0, state.frameCount - 1)) });
  },
  jumpToBeat(index: number) {
    const beat = state.beats[index];
    if (!beat) return;
    set({ mode: "sim", playhead: beat.frameIndex, playing: false });
    callbacks.jumpToBeat?.(beat, index);
  },
  /** Next beat after the playhead, wrapping to the first. */
  nextBeat() {
    const i = state.beats.findIndex((b) => b.frameIndex > Math.floor(state.playhead));
    uiActions.jumpToBeat(i === -1 ? 0 : i);
  },
  toggleDemoPanel() {
    set({ demoPanelOpen: !state.demoPanelOpen });
  },
  toggleCharts() {
    set({ chartsCollapsed: !state.chartsCollapsed });
  },
  flyOverview() {
    callbacks.flyOverview?.();
  },
  toggle2D3D() {
    const view = state.view === "3d" ? "2d" : "3d";
    set({ view });
    callbacks.toggle2D3D?.(view);
  },
  clearLog() {
    logStore.clear();
    callbacks.clearLog?.();
  },
};

export function getUiState(): UiState {
  return state;
}
export function useUiStore<T>(selector: (s: UiState) => T): T {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => selector(state),
    () => selector(state),
  );
}
