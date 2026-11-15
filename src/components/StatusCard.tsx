"use client";
// Verdict bar: GO / CAUTION / STOP, top reason, "Do this" line and the one early-warning line. Use when: the headline verdict is needed.
import { useMemo } from "react";
import { actionLine, cautionAction } from "@/lib/engine/action";
import { cachedAssess } from "@/lib/assessCache";
import { useUiData } from "./ui/UiData";
import { STATUS_BG, STATUS_BORDER, STATUS_GLOW, STATUS_TEXT, dayClock } from "./ui/shared";

export default function StatusCard() {
  const { assessment, frame, product, forecast, earlyWarning } = useUiData();
  const station = useMemo(() => cachedAssess(frame, product, "singleStation", frame.time), [frame, product]);
  const s = assessment.status;
  const top = assessment.reasons[0];
  const doThis = actionLine({ assessment, frame, product, nextSafeStart: forecast.nextSafeWindow?.start, earlyWarning: forecast.earlyWarning });
  const kind = s === "CAUTION" ? cautionAction({ assessment, frame, product, nextSafeStart: forecast.nextSafeWindow?.start, earlyWarning: forecast.earlyWarning }).kind : null;
  return (
    <section className={`rounded-xl border-2 p-4 ${STATUS_BORDER[s]} ${STATUS_BG[s]} ${s === "STOP" ? "pulse-stop" : STATUS_GLOW[s]}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className={`text-5xl font-black tracking-tight ${STATUS_TEXT[s]}`} aria-live="polite">
          {s}
          {kind && <span className="block text-lg font-bold tracking-normal" data-testid="caution-kind">{kind === "care" ? "Spray with care" : "Wait"}</span>}
        </div>
        <div className="text-right text-xs text-muted">
          <div className="font-mono">{dayClock(frame.time)}</div>
          <div className="uppercase tracking-widest">{frame.mode} · {product.name}</div>
        </div>
      </div>
      <p className="mt-2 text-base leading-snug text-foreground">{top?.text}</p>
      <p className="mt-2 rounded-lg border border-line/70 bg-panel/60 px-3 py-2 text-xl font-semibold leading-snug text-foreground" data-testid="do-this">
        <span className="mr-2 text-xs font-bold uppercase tracking-widest text-muted">Do this</span>{doThis}
      </p>
      {station.status !== s && (
        <p className="mt-2 flex items-center gap-2 whitespace-nowrap text-sm text-foreground" data-testid="station-compare">
          <span>Ground station alone (5 ft):</span>
          <span className={`rounded-full border px-2 py-0.5 text-sm font-bold ${STATUS_BORDER[station.status]} ${STATUS_BG[station.status]} ${STATUS_TEXT[station.status]}`}>{station.status}</span>
          <span className="text-muted">blind to the 30 ft layer</span>
        </p>
      )}
      {earlyWarning && (
        <p className={`mt-2 text-sm font-semibold ${STATUS_TEXT[earlyWarning.status]}`} role="alert" data-testid="early-warning">
          {earlyWarning.text}
        </p>
      )}
    </section>
  );
}
