"use client";
// 7-day derived 5 ft and 30 ft temperature (deg F) with NWS mixing height (ft) on a second axis when available.
// Use when: showing the forecast inversion pattern and the NWS context. Hourly points, no animation.
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useUiData } from "./ui/UiData";
import { Card, dateLabel } from "./ui/shared";

export default function ForecastChart() {
  const { forecast } = useUiData();
  const { data, hasNws } = useMemo(() => {
    const mix = new Map((forecast.nws ?? []).map((n) => [n.time.slice(0, 13), n.mixingHeightFt]));
    const rows = forecast.frames.map((f) => {
      const lo = f.layers.find((l) => l.heightFt === 5)!;
      const up = f.layers.find((l) => l.heightFt === 30)!;
      return { time: f.time, lowerF: lo.tempF, upperF: up.tempF, mixFt: mix.get(f.time.slice(0, 13)) };
    });
    return { data: rows, hasNws: rows.some((r) => r.mixFt !== undefined) };
  }, [forecast]);
  return (
    <Card title="Temperature at 5 ft and 30 ft" right={hasNws ? <span className="text-xs text-muted">NWS mixing height on right axis</span> : undefined}>
      <div className="h-64 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="#1e2c3d" />
            <XAxis dataKey="time" tickFormatter={(t) => dateLabel(String(t))} stroke="#8da2b8" fontSize={11} minTickGap={50} />
            <YAxis yAxisId="t" stroke="#8da2b8" fontSize={11} domain={["auto", "auto"]} unit="°" />
            {hasNws && <YAxis yAxisId="m" orientation="right" stroke="#8da2b8" fontSize={11} unit=" ft" />}
            <Tooltip contentStyle={{ background: "#0a1119", border: "1px solid #1e2c3d" }} labelFormatter={(t) => dateLabel(String(t)) + " " + String(t).slice(11, 16)} formatter={(v) => (typeof v === "number" ? v.toFixed(1) : v)} />
            <Line yAxisId="t" dataKey="upperF" name="30 ft °F" stroke="#ffb020" dot={false} strokeWidth={2} isAnimationActive={false} />
            <Line yAxisId="t" dataKey="lowerF" name="5 ft °F" stroke="#5cc8ff" dot={false} strokeWidth={2} isAnimationActive={false} />
            {hasNws && <Line yAxisId="m" dataKey="mixFt" name="Mixing height ft" stroke="#a78bfa" dot={false} strokeWidth={1.5} isAnimationActive={false} connectNulls />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
