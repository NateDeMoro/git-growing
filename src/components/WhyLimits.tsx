"use client";
// Collapsible list of every rule with cutoff, kind badge and source links. Use when: a judge asks "where do these limits come from?".
import { useState } from "react";
import { RULE_DOCS } from "@/lib/thresholds";
import { Card, KindBadge } from "./ui/shared";

export default function WhyLimits() {
  const [open, setOpen] = useState(false);
  return (
    <Card
      title="Why these limits"
      right={
        <button onClick={() => setOpen((o) => !o)} className="rounded border border-line px-2 py-1 text-xs text-muted hover:text-foreground" aria-expanded={open}>
          {open ? "Hide" : "Show"}
        </button>
      }
    >
      {open && (
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
      )}
      {!open && <p className="text-sm text-muted">Every cutoff with its source. Heuristic rules are marked tunable.</p>}
    </Card>
  );
}
