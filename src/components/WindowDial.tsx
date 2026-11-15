"use client";
// 24-hour spray-window clock: ring colored by each upcoming hour's status. Use when: a glanceable "when next" view.
import { useUiData } from "./ui/UiData";
import { Card, STATUS_HEX, clock, hourOf, statusAt } from "./ui/shared";

function arc(h: number): string {
  const r1 = 62, r2 = 88, cx = 100, cy = 100;
  const a0 = ((h / 24) * 360 - 90) * (Math.PI / 180);
  const a1 = (((h + 1) / 24) * 360 - 90) * (Math.PI / 180);
  const p = (r: number, a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
  return `M ${p(r2, a0)} A ${r2} ${r2} 0 0 1 ${p(r2, a1)} L ${p(r1, a1)} A ${r1} ${r1} 0 0 0 ${p(r1, a0)} Z`;
}

export default function WindowDial() {
  const { forecast } = useUiData();
  const next24 = forecast.frames.slice(0, 24);
  const nowH = hourOf(next24[0].time);
  return (
    <Card title="Next 24 hours">
      <div className="flex flex-col items-center gap-2">
        <svg viewBox="0 0 200 200" className="h-56 w-56" role="img" aria-label="24-hour spray window dial">
          {next24.map((f) => {
            const h = hourOf(f.time);
            const s = statusAt(forecast.windows, f.time);
            return <path key={f.time} d={arc(h)} fill={s ? STATUS_HEX[s] : "#0f1925"} opacity={0.9} stroke="#04070c" strokeWidth="1"><title>{`${clock(f.time)}: ${s}`}</title></path>;
          })}
          {[0, 6, 12, 18].map((h) => {
            const a = ((h / 24) * 360 - 90) * (Math.PI / 180);
            return <text key={h} x={100 + 48 * Math.cos(a)} y={100 + 48 * Math.sin(a) + 4} fill="#8da2b8" fontSize="11" textAnchor="middle">{h === 0 ? "12a" : h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`}</text>;
          })}
          <text x="100" y="104" fill="#e6edf5" fontSize="13" textAnchor="middle" fontWeight="bold">now {clock(next24[0].time)}</text>
          <line x1="100" y1="100" x2={100 + 58 * Math.cos(((nowH / 24) * 360 - 90) * (Math.PI / 180))} y2={100 + 58 * Math.sin(((nowH / 24) * 360 - 90) * (Math.PI / 180))} stroke="#e6edf5" strokeWidth="2" />
        </svg>
      </div>
    </Card>
  );
}
