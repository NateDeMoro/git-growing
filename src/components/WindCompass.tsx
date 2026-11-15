"use client";
// One arrow per height on a compass; shear shows as arrows pulling apart. Use when: showing wind direction at both heights.
import { useUiData } from "./ui/UiData";
import { Card } from "./ui/shared";

export default function WindCompass() {
  const { frame } = useUiData();
  const lo = frame.layers.find((l) => l.heightFt === 5)!;
  const up = frame.layers.find((l) => l.heightFt === 30)!;
  const arrow = (deg: number, mph: number, color: string, key: string) => {
    const len = Math.min(70, 25 + mph * 3.5);
    return (
      <g key={key} transform={`rotate(${(deg + 180) % 360} 100 100)`}>
        <line x1="100" y1={100 + len / 2 - 10} x2="100" y2={100 - len} stroke={color} strokeWidth="5" strokeLinecap="round" />
        <polygon points={`100,${100 - len - 12} 91,${100 - len + 4} 109,${100 - len + 4}`} fill={color} />
      </g>
    );
  };
  return (
    <Card title="Wind direction">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 200 200" className="h-44 w-44 shrink-0" role="img" aria-label="Wind direction at 5 ft and 30 ft">
          <circle cx="100" cy="100" r="92" fill="none" stroke="#1e2c3d" strokeWidth="2" />
          {["N", "E", "S", "W"].map((c, i) => (
            <text key={c} x={[100, 188, 100, 12][i]} y={[16, 104, 196, 104][i]} fill="#8da2b8" fontSize="13" textAnchor="middle">{c}</text>
          ))}
          {arrow(up.windDirDeg, up.windMph, "#ffb020", "up")}
          {arrow(lo.windDirDeg, lo.windMph, "#2bf06f", "lo")}
        </svg>
        <div className="space-y-1 text-sm">
          <div><span className="text-go">&#9632;</span> 5 ft: from {lo.windDirDeg}° at {lo.windMph.toFixed(1)} mph</div>
          <div><span className="text-caution">&#9632;</span> 30 ft: from {up.windDirDeg}° at {up.windMph.toFixed(1)} mph</div>
          <div className="text-muted">Difference {frame.derived.dirShearDeg.toFixed(0)}°. Arrows point where the wind blows to.</div>
        </div>
      </div>
    </Card>
  );
}
