"use client";
// Every reason behind the verdict, worst first, with a source chip. Use when: showing why.
import { useUiData } from "./ui/UiData";
import { Card, StatusPill } from "./ui/shared";

export default function ReasonList() {
  const { assessment } = useUiData();
  return (
    <Card title="Reasons">
      <ul className="space-y-2">
        {assessment.reasons.map((r, i) => (
          <li key={`${r.ruleId}-${i}`} className="flex items-start gap-3 text-base">
            <StatusPill status={r.status} className="mt-0.5 shrink-0" />
            <span className="flex-1">{r.text}</span>
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
