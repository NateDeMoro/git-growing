// Small shared bits: status colors, card shell, pill, formatters. Use when: any 2D panel needs them.
import type { ReactNode } from "react";
import type { SourceKind, Status } from "@/lib/contract";

export const STATUS_HEX: Record<Status, string> = { GO: "#2bf06f", CAUTION: "#ffb020", STOP: "#ff4d4d" };
export const STATUS_TEXT: Record<Status, string> = { GO: "text-go", CAUTION: "text-caution", STOP: "text-stop" };
export const STATUS_BORDER: Record<Status, string> = { GO: "border-go", CAUTION: "border-caution", STOP: "border-stop" };
export const STATUS_BG: Record<Status, string> = { GO: "bg-go/15", CAUTION: "bg-caution/15", STOP: "bg-stop/15" };
export const STATUS_GLOW: Record<Status, string> = { GO: "glow-go", CAUTION: "glow-caution", STOP: "glow-stop" };
export const STATUS_LABEL: Record<Status, string> = { GO: "GO", CAUTION: "CAUTION", STOP: "STOP" };

export function Card({ title, children, className = "", right }: { title?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-line bg-panel p-4 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusPill({ status, className = "" }: { status: Status; className?: string }) {
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold tracking-wider ${STATUS_TEXT[status]} ${STATUS_BORDER[status]} ${STATUS_BG[status]} ${className}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const KIND_STYLE: Record<SourceKind, string> = {
  standard: "border-sky-400/50 text-sky-300",
  guidance: "border-violet-400/50 text-violet-300",
  heuristic: "border-caution/60 text-caution",
};
export function KindBadge({ kind }: { kind: SourceKind }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${KIND_STYLE[kind]}`}>
      {kind === "heuristic" ? "heuristic, tunable" : kind}
    </span>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Frame ISO strings carry the Phoenix offset; read the clock digits straight from the string. */
export function clock(iso: string): string {
  const h = Number(iso.slice(11, 13));
  return `${h % 12 === 0 ? 12 : h % 12}:${iso.slice(14, 16)} ${h < 12 ? "AM" : "PM"}`;
}
export function dayClock(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return `${d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })} ${clock(iso)}`;
}
export function hourOf(iso: string): number {
  return Number(iso.slice(11, 13));
}
export function dateLabel(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}
export { pad };

export function compass(deg: number): string {
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];
}

import type { ForecastWindow } from "@/lib/contract";
/** Status of the forecast window that covers an ISO time (windows are contiguous, end exclusive). */
export function statusAt(windows: ForecastWindow[], iso: string): Status | null {
  const t = new Date(iso).getTime();
  const w = windows.find((x) => t >= new Date(x.start).getTime() && t < new Date(x.end).getTime());
  return w ? w.status : null;
}
