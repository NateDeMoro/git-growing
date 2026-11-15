"use client";
// Tower (two-height) verdict next to the single-station verdict, plus an AZMet slot. Use when: showing why one station misleads.
import { useUiData } from "./ui/UiData";
import { Card, STATUS_BG, STATUS_BORDER, STATUS_TEXT } from "./ui/shared";
import type { Assessment } from "@/lib/contract";

function Verdict({ title, a, note }: { title: string; a: Assessment; note: string }) {
  return (
    <div className={`rounded-lg border-2 p-3 ${STATUS_BORDER[a.status]} ${STATUS_BG[a.status]}`}>
      <div className="text-xs font-semibold uppercase tracking-widest text-muted">{title}</div>
      <div className={`text-3xl font-black ${STATUS_TEXT[a.status]}`}>{a.status}</div>
      <div className="mt-1 text-xs text-muted">{note}</div>
    </div>
  );
}

export default function StationCompare() {
  const { assessment, stationAssessment, azmet } = useUiData();
  const differ = stationAssessment && stationAssessment.status !== assessment.status;
  return (
    <Card title="Tower vs single station">
      <div className="grid grid-cols-2 gap-3">
        <Verdict title="5 ft + 30 ft tower" a={assessment} note="Sees the inversion" />
        {stationAssessment && <Verdict title="Single station (5 ft only)" a={stationAssessment} note="Blind to the layer above" />}
      </div>
      {differ && (
        <p className="mt-2 text-sm font-semibold text-caution">The single station disagrees with the tower. Only the tower sees the 30 ft layer.</p>
      )}
      {azmet ? (
        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-line p-2">
          <div className="text-xs text-muted">
            <div className="font-semibold uppercase tracking-widest">Regional AZMet: {azmet.reading.stationName}</div>
            <div>
              {azmet.reading.tempF?.toFixed(1) ?? "n/a"}°F · {azmet.reading.windMph?.toFixed(1) ?? "n/a"} mph · {azmet.reading.rhPct ?? "n/a"}% RH
              {azmet.cached ? " (cached)" : ""}
            </div>
          </div>
          <span className={`text-2xl font-black ${STATUS_TEXT[azmet.assessment.status]}`}>{azmet.assessment.status}</span>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-line p-2 text-xs text-muted">
          Regional AZMet station (Yuma): live mode only.
        </div>
      )}
    </Card>
  );
}
