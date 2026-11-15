"use client";
// HTML overlay on the map: status pill, time chip, Heights x10, legend, attribution, block list, buttons.
// Use when: SceneMap needs its on-screen controls.
import type { Status } from "@/lib/contract";
import { SITE } from "@/lib/site";
import { STATUS_RGB } from "@/lib/scene/color";

export interface OverlayProps {
  status: Status;
  timeLabel: string;
  focusId: string;
  onFocus: (id: string) => void;
  onOverview: () => void;
  onToggle2D: () => void;
  flat: boolean;
  bearing: number;
  onRotate: (deg: number) => void;
  onNorth: () => void;
  noTiles: boolean;
}

const chip = "rounded-md border border-slate-600/70 bg-slate-950/75 px-2 py-1 text-xs text-slate-200 backdrop-blur";

export default function Overlay(p: OverlayProps) {
  const c = STATUS_RGB[p.status].join(",");
  return (
    <div className="pointer-events-none absolute inset-0 text-slate-100">
      <div className="absolute left-3 top-3 flex max-w-[70%] flex-col gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold" style={{ background: `rgba(${c},0.18)`, border: `1px solid rgba(${c},0.9)`, boxShadow: `0 0 14px rgba(${c},0.5)` }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: `rgb(${c})`, boxShadow: `0 0 8px rgb(${c})` }} />
          {p.status}
        </div>
        <div className={chip + " w-fit"}>{p.timeLabel}</div>
      </div>
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
        <div className={chip}>Heights x10</div>
        <div className="pointer-events-auto flex gap-2">
          <button className={chip + " hover:bg-slate-800"} onClick={p.onOverview}>Overview (F)</button>
          <button className={chip + " hover:bg-slate-800"} onClick={p.onToggle2D}>{p.flat ? "3D" : "2D"} (V)</button>
        </div>
        <div className="pointer-events-auto flex items-center gap-1">
          <button className={chip + " hover:bg-slate-800"} aria-label="Rotate view left" onClick={() => p.onRotate(-15)}>&#x21BA;</button>
          <button className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-500 bg-slate-950/80 hover:bg-slate-800" aria-label="Compass, click for north up" title="North up" onClick={p.onNorth}>
            <svg viewBox="-20 -20 40 40" width="36" height="36" style={{ transform: `rotate(${-p.bearing}deg)` }}>
              <polygon points="0,-16 5,0 -5,0" fill="#ef4444" />
              <polygon points="0,16 5,0 -5,0" fill="#e2e8f0" />
              <text x="0" y="-7" fontSize="7" textAnchor="middle" fill="#fff" fontWeight="700">N</text>
            </svg>
          </button>
          <button className={chip + " hover:bg-slate-800"} aria-label="Rotate view right" onClick={() => p.onRotate(15)}>&#x21BB;</button>
        </div>
      </div>
      <div className="absolute bottom-6 left-3 flex flex-col gap-1">
        <div className={chip + " pointer-events-auto flex max-w-[260px] flex-wrap gap-1"}>
          {SITE.blocks.map((b) => (
            <button key={b.id} onClick={() => p.onFocus(b.id)} className={`rounded px-1.5 py-0.5 ${b.id === p.focusId ? "bg-slate-100 font-semibold text-slate-900" : "hover:bg-slate-700"}`}>
              {b.id}
            </button>
          ))}
        </div>
      </div>
      <div className="absolute bottom-1 right-2 text-[10px] text-slate-400">
        Imagery: Esri, Maxar, Earthstar Geographics{p.noTiles ? " (offline: no imagery)" : ""}
      </div>
    </div>
  );
}
