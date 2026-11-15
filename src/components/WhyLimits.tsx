"use client";
// Modal listing every rule with cutoff, kind badge and source links. Use when: a judge asks "where do these limits come from?".
// Opened from the "Why these limits" button in the Reasons card; closes on Esc, backdrop click or Close.
import { useEffect } from "react";
import { RULE_DOCS } from "@/lib/thresholds";
import { KindBadge } from "./ui/shared";

export default function WhyLimits({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Why these limits">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-line bg-panel p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">Why these limits</h2>
          <button onClick={onClose} className="rounded border border-line px-2 py-1 text-xs text-muted hover:text-foreground">Close</button>
        </div>
        <p className="mb-3 text-sm text-muted">Every cutoff with its source. Heuristic rules are marked tunable.</p>
        <ul className="space-y-3">
          {RULE_DOCS.map((r) => (
            <li key={r.ruleId} className="border-b border-line/60 pb-2">
              <div className="font-semibold">{r.name}</div>
              <div className="font-mono text-sm text-muted">{r.cutoff}</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {r.sources.map((s) => (
                  <span key={s.id} className="flex items-center gap-1.5 text-xs">
                    <KindBadge kind={s.kind} />
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer" title={s.title} className="text-sky-300 underline">{s.short}</a>
                    ) : (
                      <span title={s.title} className="text-muted">{s.short}</span>
                    )}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
