"use client";
// 5 ft and 30 ft wind speed with shaded too-calm (< 3 mph) and too-strong (>= label max) bands. Use when: showing the wind window.
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { T } from "@/lib/thresholds";
import { useUiData } from "./ui/UiData";
import { clock } from "./ui/shared";

export default function WindChart() {
  const { history, product } = useUiData();
  const max = product.labelWindMaxMph;
  const top = Math.max(20, ...history.map((h) => Math.max(h.lowerWindMph, h.upperWindMph))) + 2;
  return (
    <div className="h-44 min-w-0">
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">Wind, last 24 h <span className="normal-case">(shaded: under {T.wind.minMph} mph, over {max} mph)</span></div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={history} margin={{ top: 4, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#1e2c3d" />
          <ReferenceArea y1={0} y2={T.wind.minMph} fill="#ffb020" fillOpacity={0.16} />
          <ReferenceArea y1={max} y2={top} fill="#ff4d4d" fillOpacity={0.16} />
          <XAxis dataKey="time" tickFormatter={clock} stroke="#8da2b8" fontSize={11} minTickGap={30} />
          <YAxis stroke="#8da2b8" fontSize={11} domain={[0, top]} unit=" mph" />
          <Tooltip contentStyle={{ background: "#0a1119", border: "1px solid #1e2c3d" }} labelFormatter={(t) => clock(String(t))} />
          <Line dataKey="upperWindMph" name="30 ft mph" stroke="#ffb020" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line dataKey="lowerWindMph" name="5 ft mph" stroke="#5cc8ff" dot={false} strokeWidth={2} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
