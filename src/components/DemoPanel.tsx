"use client";
// Global hotkeys + hidden demo panel. Use when: demoing; backtick toggles the panel, hotkeys work while hidden.
// Keys: ` panel, 1-6 beats A-F, space pause, [ ] speed, R clear log, F fly to overview, V 2D/3D, L Live/Simulate.
// F, V only call uiActions (store + registered callbacks); W6/W7 wire the camera via registerUiCallbacks().
import { useEffect } from "react";
import { uiActions, useUiStore } from "@/lib/uiStore";

export function handleHotkey(e: KeyboardEvent): boolean {
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  const t = e.target as HTMLElement | null;
  if (t) {
    const textLike = t.tagName === "INPUT" && !["range", "button", "checkbox"].includes((t as HTMLInputElement).type);
    if (textLike || t.tagName === "SELECT" || t.tagName === "TEXTAREA" || t.isContentEditable) return false;
  }
  const k = e.key;
  if (k === "`") uiActions.toggleDemoPanel();
  else if (k >= "1" && k <= "6") uiActions.jumpToBeat(Number(k) - 1);
  else if (k === " ") {
    const a = document.activeElement as HTMLElement | null;
    if (a && a.tagName === "BUTTON") a.blur();
    uiActions.togglePlay();
  }
  else if (k === "[") uiActions.stepSpeed(-1);
  else if (k === "]") uiActions.stepSpeed(1);
  else if (k === "r" || k === "R") uiActions.clearLog();
  else if (k === "f" || k === "F") uiActions.flyOverview();
  else if (k === "v" || k === "V") uiActions.toggle2D3D();
  else if (k === "l" || k === "L") uiActions.toggleMode();
  else return false;
  e.preventDefault();
  return true;
}

export default function DemoPanel() {
  const open = useUiStore((s) => s.demoPanelOpen);
  const beats = useUiStore((s) => s.beats);
  const speed = useUiStore((s) => s.speed);
  const mode = useUiStore((s) => s.mode);
  const view = useUiStore((s) => s.view);
  useEffect(() => {
    const onUp = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.tagName === "INPUT" && (t as HTMLInputElement).type === "range") t.blur();
    };
    window.addEventListener("keydown", handleHotkey);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("keydown", handleHotkey);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);
  if (!open) return null;
  const keys: [string, string][] = [
    ["`", "Hide this panel"], ["1-6", "Jump to beat A-F"], ["Space", "Play / pause"], ["[  ]", `Speed (now ${speed}x)`],
    ["R", "Clear log"], ["← →", "Rotate view"], ["F", "Fly to overview"], ["V", `Toggle 2D/3D (now ${view})`], ["L", `Live / Simulate (now ${mode})`],
  ];
  return (
    <aside className="fixed bottom-24 right-4 z-50 w-80 rounded-xl border border-line bg-panel/95 p-4 shadow-2xl backdrop-blur" aria-label="Demo panel">
      <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted">Demo panel</div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {beats.map((b, i) => (
          <button key={b.id} onClick={() => uiActions.jumpToBeat(i)} title={b.label} className="rounded-md border border-line px-2 py-1.5 text-left text-xs hover:border-go">
            <b className="text-caution">{i + 1} · {b.id}</b> <span className="text-muted">{b.label}</span>
          </button>
        ))}
      </div>
      <dl className="space-y-1 text-sm">
        {keys.map(([k, d]) => (
          <div key={k} className="flex justify-between gap-3"><dt className="font-mono text-go">{k}</dt><dd className="text-muted">{d}</dd></div>
        ))}
      </dl>
    </aside>
  );
}
