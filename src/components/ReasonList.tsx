"use client";
// Every reason behind the verdict, worst first, with a source chip. Use when: showing why.
import { useState } from "react";
import { useUiData } from "./ui/UiData";
import { Card, StatusPill } from "./ui/shared";
import WhyLimits from "./WhyLimits";

export default function ReasonList() {
  const { assessment } = useUiData();
  const [why, setWhy] = useState(false);
  return (
    <Card
      title="Reasons"
      right={<button onClick={() => setWhy(true)} className="text-xs text-sky-300 underline hover:text-sky-200">Why these limits</button>}
    >
      {why && <WhyLimits onClose={() => setWhy(false)} />}
      <ul className="space-y-2">
        {assessment.reasons.map((r, i) => (
          <li key={`${r.ruleId}-${i}`} className="flex items-start gap-3 text-sm">
            <StatusPill status={r.status} className="mt-0.5 shrink-0" />
            <span className="min-w-0 flex-1 break-words">{r.text}</span>
            {r.source.url ? (
              <a href={r.source.url} target="_blank" rel="noreferrer" className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[11px] text-sky-300 hover:bg-panel2">
                {r.source.short}
              </a>
            ) : (
              <span className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[11px] text-muted">{r.source.short}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
