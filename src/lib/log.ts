// Browser log store + CSV export. Use when: recording status changes / hourly readings, or exporting the log.
// Persists to localStorage inside try/catch; falls back to memory when storage is missing or throws (SSR, private mode).
import type { LogEntry } from "./contract";

export const LOG_CAP = 5000;
const KEY = "spray-or-wait.log.v1";

export const CSV_HEADER = [
  "time", "logged_at", "mode", "status", "status_changed", "product", "droplet", "nozzle", "reasons",
  "temp_5ft_F", "temp_30ft_F", "wind_5ft_mph", "wind_30ft_mph", "dir_5ft_deg", "dir_30ft_deg", "delta_t_C", "rain_in_hr",
];

/** Quote a field only when it holds a comma, quote or newline (inner quotes doubled). */
export function csvField(v: string | number | boolean | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Use when: Download CSV. Reasons share one cell, joined by "; ". */
export function toCsv(entries: LogEntry[]): string {
  const rows = entries.map((e) =>
    [
      e.time, e.loggedAt, e.mode, e.status, e.statusChanged, e.productId, e.recommendedDroplet ?? "none", e.nozzle ?? "",
      e.triggers.join("; "), e.lowerTempF, e.upperTempF, e.lowerWindMph, e.upperWindMph,
      e.lowerDirDeg, e.upperDirDeg, e.deltaTC, e.rainInHr,
    ].map(csvField).join(","),
  );
  return [CSV_HEADER.join(","), ...rows].join("\n");
}

type StorageGetter = () => Storage | null;

const browserStorage: StorageGetter = () => {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
};

/** Use when: you need an isolated store (tests) or the shared one (`logStore`). */
export function createLogStore(getStorage: StorageGetter = browserStorage) {
  let entries: LogEntry[] = [];
  let loaded = false;
  const listeners = new Set<() => void>();

  function load() {
    if (loaded) return;
    loaded = true;
    try {
      const raw = getStorage()?.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) entries = parsed.slice(-LOG_CAP);
      }
    } catch {
      /* memory only */
    }
  }
  function persist() {
    try {
      getStorage()?.setItem(KEY, JSON.stringify(entries));
    } catch {
      /* memory only */
    }
  }
  function emit() {
    listeners.forEach((l) => l());
  }

  return {
    getAll(): LogEntry[] {
      load();
      return entries;
    },
    append(e: LogEntry) {
      load();
      entries = entries.length >= LOG_CAP ? [...entries.slice(entries.length - LOG_CAP + 1), e] : [...entries, e];
      persist();
      emit();
    },
    clear() {
      load();
      entries = [];
      persist();
      emit();
    },
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

export const logStore = createLogStore();
