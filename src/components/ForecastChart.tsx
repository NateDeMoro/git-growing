"use client";
// 7-day derived 5 ft and 30 ft temperature (deg F) for the selected tower.
// Use when: showing the forecast inversion pattern. Hourly points, no animation. Add towers to TOWERS to extend the selector.
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useUiData } from "./ui/UiData";
import { Card, dateLabel } from "./ui/shared";
import { SITE } from "@/lib/site";

const TOWERS = [{ id: "yuma-mesa", name: "Yuma Mesa tower", ...SITE.tower }];

export default function ForecastChart() {
  const { forecast } = useUiData();
  const [selectedTowerId, setSelectedTowerId] = useState(TOWERS[0].id);
  const data = useMemo(
    () =>
      forecast.frames.map((f) => {
        const lo = f.layers.find((l) => l.heightFt === 5)!;
        const up = f.layers.find((l) => l.heightFt === 30)!;
        return { time: f.time, lowerF: lo.tempF, upperF: up.tempF };
      }),
    [forecast],
  );
  return (
    <Card title="Temperature at 5 ft and 30 ft" right={
        <label className="flex items-center gap-2 text-xs text-muted">
          Tower
          <select value={selectedTowerId} onChange={(e) => setSelectedTowerId(e.target.value)} className="rounded-md border border-line bg-panel px-2 py-1 text-xs text-text">
            {TOWERS.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
      }>
      <div className="h-64 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="#1e2c3d" />
            <XAxis dataKey="time" tickFormatter={(t) => dateLabel(String(t))} stroke="#8da2b8" fontSize={11} minTickGap={50} />
            <YAxis yAxisId="t" stroke="#8da2b8" fontSize={11} domain={["auto", "auto"]} unit="°" />
            <Tooltip contentStyle={{ background: "#0a1119", border: "1px solid #1e2c3d" }} labelFormatter={(t) => dateLabel(String(t)) + " " + String(t).slice(11, 16)} formatter={(v) => (typeof v === "number" ? v.toFixed(1) : v)} />
            <Line yAxisId="t" dataKey="upperF" name="30 ft °F" stroke="#ffb020" dot={false} strokeWidth={2} isAnimationActive={false} />
            <Line yAxisId="t" dataKey="lowerF" name="5 ft °F" stroke="#5cc8ff" dot={false} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
