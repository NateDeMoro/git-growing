"use client";
// Two-height mast drawing with temps and wind arrows; warm-over-cool band when inverted. Use when: showing the tower at a glance.
import { useUiData } from "./ui/UiData";
import { Card } from "./ui/shared";

export default function MastSVG() {
  const { frame } = useUiData();
  const lo = frame.layers.find((l) => l.heightFt === 5)!;
  const up = frame.layers.find((l) => l.heightFt === 30)!;
  const inverted = frame.derived.inversionF > 0;
  const yUp = 50, yLo = 190;
  const arrow = (y: number, deg: number, mph: number, color: string) => {
    const len = 18 + mph * 3;
    // Wind blows toward deg+180 (compass); screen rotation: 0 = up.
    return (
      <g transform={`translate(70 ${y}) rotate(${(deg + 180) % 360})`}>
        <line x1="0" y1={len / 2} x2="0" y2={-len / 2} stroke={color} strokeWidth="3" />
        <polygon points={`0,${-len / 2 - 6} -5,${-len / 2 + 4} 5,${-len / 2 + 4}`} fill={color} />
      </g>
    );
  };
  return (
    <Card title="Mast">
      <svg viewBox="0 0 320 240" className="h-56 w-full" role="img" aria-label="Tower with 5 ft and 30 ft readings">
        <rect x="0" y="0" width="320" height="240" fill="transparent" />
        {inverted && (
          <>
            <rect x="20" y="20" width="280" height="90" fill="#ff8a1f" opacity="0.28" />
            <rect x="20" y="110" width="280" height="110" fill="#3b82f6" opacity="0.28" />
            <text x="26" y="36" fill="#ffb020" fontSize="11">warm air over cool air</text>
          </>
        )}
        <line x1="20" y1="220" x2="300" y2="220" stroke="#335" strokeWidth="2" />
        <rect x="118" y="40" width="4" height="180" fill="#8da2b8" />
        <circle cx="120" cy={yUp} r="9" fill={inverted ? "#ff8a1f" : "#6aa8ff"} />
        <circle cx="120" cy={yLo} r="9" fill="#6aa8ff" />
        <text x="136" y={yUp + 4} fill="#e6edf5" fontSize="15" fontFamily="monospace">30 ft {up.tempF.toFixed(1)}°F</text>
        <text x="136" y={yLo + 4} fill="#e6edf5" fontSize="15" fontFamily="monospace">5 ft {lo.tempF.toFixed(1)}°F</text>
        {arrow(yUp, up.windDirDeg, up.windMph, "#2bf06f")}
        {arrow(yLo, lo.windDirDeg, lo.windMph, "#2bf06f")}
        <text x="40" y={yUp + 40} fill="#8da2b8" fontSize="12" fontFamily="monospace">{up.windMph.toFixed(1)} mph</text>
        <text x="40" y={yLo + 40} fill="#8da2b8" fontSize="12" fontFamily="monospace">{lo.windMph.toFixed(1)} mph</text>
      </svg>
    </Card>
  );
}
