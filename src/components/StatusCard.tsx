"use client";
// Big GO / CAUTION / STOP card with the top reason. Use when: the headline verdict is needed.
import { useUiData } from "./ui/UiData";
import { STATUS_BG, STATUS_BORDER, STATUS_GLOW, STATUS_TEXT, dayClock } from "./ui/shared";

export default function StatusCard() {
  const { assessment, frame, product } = useUiData();
  const s = assessment.status;
  const top = assessment.reasons[0];
  return (
    <section className={`rounded-xl border-2 p-5 ${STATUS_BORDER[s]} ${STATUS_BG[s]} ${s === "STOP" ? "pulse-stop" : STATUS_GLOW[s]}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className={`text-6xl font-black tracking-tight ${STATUS_TEXT[s]}`} aria-live="polite">
          {s === "GO" ? "GO" : s}
        </div>
        <div className="text-right text-xs text-muted">
          <div className="font-mono">{dayClock(frame.time)}</div>
          <div className="uppercase tracking-widest">{frame.mode}</div>
        </div>
      </div>
      <p className="mt-2 text-lg leading-snug text-foreground">{top?.text}</p>
      <p className="mt-1 text-xs text-muted">Product: {product.name}</p>
    </section>
  );
}
