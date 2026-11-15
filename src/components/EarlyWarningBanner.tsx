"use client";
// Early warning: look-ahead text in sim mode ("storm arriving in 3 hours"), forecast warning otherwise, explicit "none" state.
// Use when: telling the user conditions will get worse soon. compact = only render when a warning exists (Now tab).
import { useUiData } from "./ui/UiData";
import { STATUS_BG, STATUS_BORDER, STATUS_TEXT } from "./ui/shared";

export default function EarlyWarningBanner({ compact = false }: { compact?: boolean }) {
  const { earlyWarning } = useUiData(); // same source as the Now tab verdict bar
  if (!earlyWarning) {
    if (compact) return null;
    return (
      <div className="rounded-xl border border-line bg-panel p-4 text-lg text-muted">
        <b className="text-go">No early warning.</b> Conditions are not expected to get worse in the next 6 hours.
      </div>
    );
  }
  return (
    <div className={`rounded-xl border-2 p-4 ${STATUS_BORDER[earlyWarning.status]} ${STATUS_BG[earlyWarning.status]}`} role="alert">
      <span className={`mr-2 text-sm font-black uppercase tracking-widest ${STATUS_TEXT[earlyWarning.status]}`}>Early warning</span>
      <span className="text-lg">{earlyWarning.text}. {earlyWarning.reason}</span>
    </div>
  );
}
