"use client";
// Early warning: look-ahead text in sim mode ("storm arriving in 3 hours"), forecast warning otherwise, explicit "none" state.
// Use when: telling the user conditions will get worse soon. compact = only render when a warning exists (Now tab).
import { useUiData } from "./ui/UiData";
import { STATUS_BG, STATUS_BORDER, STATUS_TEXT, dayClock } from "./ui/shared";

export default function EarlyWarningBanner({ compact = false }: { compact?: boolean }) {
  const { frame, lookAhead, forecast } = useUiData();
  const warn = frame.mode === "sim"
    ? lookAhead && { status: lookAhead.status, text: lookAhead.text }
    : forecast.earlyWarning && { status: forecast.earlyWarning.status, text: `${forecast.earlyWarning.status} expected at ${dayClock(forecast.earlyWarning.at)}: ${forecast.earlyWarning.reason}` };
  if (!warn) {
    if (compact) return null;
    return (
      <div className="rounded-xl border border-line bg-panel p-4 text-lg text-muted">
        <b className="text-go">No early warning.</b> Conditions are not expected to get worse in the next 6 hours.
      </div>
    );
  }
  return (
    <div className={`rounded-xl border-2 p-4 ${STATUS_BORDER[warn.status]} ${STATUS_BG[warn.status]}`} role="alert">
      <span className={`mr-2 text-sm font-black uppercase tracking-widest ${STATUS_TEXT[warn.status]}`}>Early warning</span>
      <span className="text-lg">{warn.text}</span>
    </div>
  );
}
