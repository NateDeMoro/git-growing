"use client";
// 7 days x 24 hours, one cell per hour colored by status. Use when: scanning the week for spray windows.
import { useUiData } from "./ui/UiData";
import { Card, STATUS_HEX, dateLabel, hourOf, statusAt, clock } from "./ui/shared";

export default function ForecastStrip() {
  const { forecast } = useUiData();
  const days = new Map<string, typeof forecast.frames>();
  for (const f of forecast.frames) {
    const k = f.time.slice(0, 10);
    days.set(k, [...(days.get(k) ?? []), f]);
  }
  return (
    <Card title="7-day forecast by hour">
      <div className="space-y-1">
        <div className="grid grid-cols-[84px_repeat(24,minmax(0,1fr))] gap-px text-[10px] text-muted">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center">{h % 6 === 0 ? h : ""}</span>
          ))}
        </div>
        {[...days.entries()].map(([k, fs]) => (
          <div key={k} className="grid grid-cols-[84px_repeat(24,minmax(0,1fr))] items-center gap-px">
            <span className="text-xs text-muted">{dateLabel(fs[0].time)}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const f = fs.find((x) => hourOf(x.time) === h);
              const s = f ? statusAt(forecast.windows, f.time) : null;
              return (
                <span
                  key={h}
                  title={f && s ? `${clock(f.time)}: ${s}` : ""}
                  className="h-6 rounded-[2px]"
                  style={{ background: s ? STATUS_HEX[s] : "#0f1925", opacity: s ? 0.85 : 1 }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted">
        {(["GO", "CAUTION", "STOP"] as const).map((s) => (
          <span key={s}><span style={{ color: STATUS_HEX[s] }}>&#9632;</span> {s}</span>
        ))}
      </div>
    </Card>
  );
}
