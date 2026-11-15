"use client";
// HTML overlay on the map: status pill, time chip, Heights x10, legend, attribution, block list, buttons.
// Use when: SceneMap needs its on-screen controls.
import type { Status } from "@/lib/contract";
import { SITE } from "@/lib/site";
import { tempRamp, STATUS_RGB } from "@/lib/scene/color";

export interface OverlayProps {
  status: Status;
  topReason: string;
  timeLabel: string;
  tMin: number;
  tMax: number;
  focusId: string;
  onFocus: (id: string) => void;
  onOverview: () => void;
  onToggle2D: () => void;
  flat: boolean;
  spraying: boolean;
  onSpray: (v: boolean) => void;
  illustrative: boolean;
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
          <span className="hidden max-w-[360px] truncate font-normal text-slate-200 sm:inline">{p.topReason}</span>
        </div>
        <div className={chip + " w-fit"}>{p.timeLabel}</div>
        {p.illustrative && <div className={chip + " w-fit text-amber-300"}>illustrative neighbors</div>}
      </div>
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
        <div className={chip}>Heights x10</div>
        <div className="pointer-events-auto flex gap-2">
          <button className={chip + " hover:bg-slate-800"} onClick={p.onOverview}>Overview (F)</button>
          <button className={chip + " hover:bg-slate-800"} onClick={p.onToggle2D}>{p.flat ? "3D" : "2D"} (V)</button>
        </div>
        <label className={chip + " pointer-events-auto flex items-center gap-1"}>
          <input type="checkbox" checked={p.spraying} onChange={(e) => p.onSpray(e.target.checked)} /> Spraying
        </label>
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
      <div className="absolute bottom-6 right-3 flex items-end gap-2">
        <div className={chip + " flex items-stretch gap-2"}>
          <div className="w-2.5 rounded" style={{ background: tempRamp(), height: 70 }} />
          <div className="flex flex-col justify-between"><span>{p.tMax.toFixed(0)}°F</span><span>{p.tMin.toFixed(0)}°F</span></div>
        </div>
      </div>
      <div className="absolute bottom-1 right-2 text-[10px] text-slate-400">
        Imagery: Esri, Maxar, Earthstar Geographics{p.noTiles ? " (offline: no imagery)" : ""}
      </div>
    </div>
  );
}
