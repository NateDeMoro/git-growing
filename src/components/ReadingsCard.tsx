"use client";
// 5 ft and 30 ft readings side by side plus derived values and weather. Use when: showing raw numbers.
import { useUiData } from "./ui/UiData";
import { Card, compass } from "./ui/shared";

function Col({ label, temp, wind, dir }: { label: string; temp: number; wind: number; dir: number }) {
  return (
    <div className="rounded-lg border border-line bg-panel2 px-3 py-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold uppercase tracking-widest text-muted">{label}</span>
        <span className="font-mono text-muted">from {compass(dir)} ({dir}°)</span>
      </div>
      <div className="flex items-baseline gap-4 leading-tight">
        <span className="font-mono text-2xl font-bold">{temp.toFixed(1)}°F</span>
        <span className="font-mono text-xl">{wind.toFixed(1)} mph</span>
      </div>
    </div>
  );
}
function Stat({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-line/60 py-px text-xs${wide ? " sm:col-span-2" : ""}`}>
      <span className="text-muted">{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  );
}

export default function ReadingsCard() {
  const { frame } = useUiData();
  const lo = frame.layers.find((l) => l.heightFt === 5)!;
  const up = frame.layers.find((l) => l.heightFt === 30)!;
  const d = frame.derived;
  const w = frame.weather;
  return (
    <Card title="Readings" className="!p-3">
      <div className="grid grid-cols-2 gap-2">
        <Col label="5 ft (lower)" temp={lo.tempF} wind={lo.windMph} dir={lo.windDirDeg} />
        <Col label="30 ft (upper)" temp={up.tempF} wind={up.windMph} dir={up.windDirDeg} />
      </div>
      <div className="mt-2 grid grid-cols-1 gap-x-5 sm:grid-cols-4">
        <Stat k="Inversion (30-5 ft)" v={`${d.inversionF.toFixed(1)}°F`} />
        <Stat k="Speed difference" v={`${d.speedShearMph.toFixed(1)} mph`} />
        <Stat k="Direction difference" v={`${d.dirShearDeg.toFixed(0)}°`} />
        <Stat k="Delta T" v={`${d.deltaTC.toFixed(1)}°C`} />
        <Stat k="Humidity" v={`${d.rhPct.toFixed(0)}%`} />
        <Stat k="Gusts" v={`${w.gustMph.toFixed(0)} mph`} />
        <Stat k="Rain" v={`${w.rainInHr.toFixed(2)} in/hr`} />
        <Stat k="Cloud" v={`${w.cloudPct.toFixed(0)}%`} />
        <Stat wide k="Pressure" v={`${w.pressureHpa.toFixed(1)} hPa (${w.pressureTrendHpaPerHr.toFixed(1)}/hr)`} />
        <Stat k="Sun elevation" v={`${frame.sun.elevationDeg.toFixed(0)}°`} />
      </div>
    </Card>
  );
}
