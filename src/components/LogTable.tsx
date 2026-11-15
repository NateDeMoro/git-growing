"use client";
// Log tab: newest first, status-change rows highlighted, status filter, Download CSV, Clear (confirm).
// Use when: showing or exporting the browser log.
import { useState, useSyncExternalStore } from "react";
import type { LogEntry, Status } from "@/lib/contract";
import { logStore, toCsv } from "@/lib/log";
import { uiActions } from "@/lib/uiStore";
import { StatusPill, dayClock } from "./ui/shared";

const EMPTY: LogEntry[] = [];

export default function LogTable() {
  const entries = useSyncExternalStore(logStore.subscribe, logStore.getAll, () => EMPTY);
  const [filter, setFilter] = useState<Status | "ALL">("ALL");
  const rows = entries.filter((e) => filter === "ALL" || e.status === filter).slice().reverse().slice(0, 500);

  function download() {
    const blob = new Blob([toCsv(entries)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spray-or-wait-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  function clear() {
    if (window.confirm("Clear the whole log?")) uiActions.clearLog();
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Log <span className="text-sm font-normal text-muted">({entries.length} entries, showing newest {rows.length})</span></h2>
        <div className="flex gap-1" role="group" aria-label="Status filter">
          {(["ALL", "GO", "CAUTION", "STOP"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-md border px-3 py-1 text-sm ${filter === f ? "border-go text-go" : "border-line text-muted"}`}>{f}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={download} disabled={!entries.length} className="rounded-md border border-line px-3 py-1.5 text-sm text-sky-300 disabled:opacity-40">Download CSV</button>
          <button onClick={clear} disabled={!entries.length} className="rounded-md border border-stop/60 px-3 py-1.5 text-sm text-stop disabled:opacity-40">Clear</button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-panel2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="p-2">Time</th><th className="p-2">Mode</th><th className="p-2">Status</th><th className="p-2">Triggers</th>
              <th className="p-2">5 ft</th><th className="p-2">30 ft</th><th className="p-2">Droplet</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted">No entries yet. Press play on the Now tab to fill the log.</td></tr>
            )}
            {rows.map((e, i) => (
              <tr key={`${e.loggedAt}-${i}`} className={`border-t border-line align-top ${e.statusChanged ? "bg-caution/10" : ""}`}>
                <td className="whitespace-nowrap p-2 font-mono">{dayClock(e.time)}{e.statusChanged && <span className="ml-2 text-[10px] font-bold text-caution">CHANGE</span>}</td>
                <td className="p-2">{e.mode}</td>
                <td className="p-2"><StatusPill status={e.status} /></td>
                <td className="max-w-[420px] p-2">{e.triggers.slice(0, 2).join(" | ")}{e.triggers.length > 2 && ` (+${e.triggers.length - 2})`}</td>
                <td className="whitespace-nowrap p-2 font-mono">{e.lowerTempF.toFixed(1)}°F {e.lowerWindMph.toFixed(1)} mph {e.lowerDirDeg}°</td>
                <td className="whitespace-nowrap p-2 font-mono">{e.upperTempF.toFixed(1)}°F {e.upperWindMph.toFixed(1)} mph {e.upperDirDeg}°</td>
                <td className="p-2 font-mono">{e.recommendedDroplet ?? "none"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
