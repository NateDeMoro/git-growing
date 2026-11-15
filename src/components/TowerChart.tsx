"use client";
// 5 ft and 30 ft temperature over the last 24 sim-hours, inverted spans shaded (Battany style). Use when: showing the inversion over time.
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useUiData, type HistoryPoint } from "./ui/UiData";
import { clock } from "./ui/shared";

export function invertedSpans(h: HistoryPoint[]): [string, string][] {
  const out: [string, string][] = [];
  let start: string | null = null;
  h.forEach((p, i) => {
    if (p.inverted && start === null) start = p.time;
    if (start !== null && (!p.inverted || i === h.length - 1)) {
      out.push([start, p.inverted ? p.time : h[i - 1].time]);
      start = null;
    }
  });
  return out;
}

export default function TowerChart() {
  const { history } = useUiData();
  return (
    <div className="h-44 min-w-0">
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">Temperature, last 24 h <span className="text-stop/80 normal-case">(red band = inversion)</span></div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={history} margin={{ top: 4, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#1e2c3d" />
          {invertedSpans(history).map(([a, b]) => (
            <ReferenceArea key={a} x1={a} x2={b} fill="#ff4d4d" fillOpacity={0.18} ifOverflow="extendDomain" />
          ))}
          <XAxis dataKey="time" tickFormatter={clock} stroke="#8da2b8" fontSize={11} minTickGap={30} />
          <YAxis stroke="#8da2b8" fontSize={11} domain={["auto", "auto"]} unit="°" />
          <Tooltip contentStyle={{ background: "#0a1119", border: "1px solid #1e2c3d" }} labelFormatter={(t) => clock(String(t))} />
          <Line dataKey="upperTempF" name="30 ft °F" stroke="#ffb020" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line dataKey="lowerTempF" name="5 ft °F" stroke="#5cc8ff" dot={false} strokeWidth={2} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
