"use client";
// Next safe spray window (GO for 2+ hours). Use when: the answer to "when can I spray?" is needed.
import { useUiData } from "./ui/UiData";
import { Card, dayClock } from "./ui/shared";

export default function NextWindowCard() {
  const { forecast } = useUiData();
  const w = forecast.nextSafeWindow;
  const hours = w ? Math.round((new Date(w.end).getTime() - new Date(w.start).getTime()) / 3600_000) : 0;
  return (
    <Card title="Next safe window">
      {w ? (
        <>
          <div className="font-mono text-2xl font-bold text-go">{dayClock(w.start)} to {dayClock(w.end)}</div>
          <div className="text-sm text-muted">{hours} hours of GO</div>
        </>
      ) : (
        <div className="text-lg text-caution">No safe window of 2 hours or more in the forecast.</div>
      )}
    </Card>
  );
}
