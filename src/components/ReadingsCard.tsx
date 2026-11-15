"use client";
// 5 ft and 30 ft readings side by side plus derived values and weather. Use when: showing raw numbers.
import { useUiData } from "./ui/UiData";
import { Card, compass } from "./ui/shared";

function Col({ label, temp, wind, dir }: { label: string; temp: number; wind: number; dir: number }) {
  return (
    <div className="rounded-lg border border-line bg-panel2 p-3">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-1 font-mono text-3xl font-bold">{temp.toFixed(1)}°F</div>
      <div className="font-mono text-lg">{wind.toFixed(1)} mph</div>
      <div className="font-mono text-sm text-muted">from {compass(dir)} ({dir}°)</div>
    </div>
  );
}
function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-line/60 py-1 text-sm">
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
    <Card title="Readings">
      <div className="grid grid-cols-2 gap-3">
        <Col label="5 ft (lower)" temp={lo.tempF} wind={lo.windMph} dir={lo.windDirDeg} />
        <Col label="30 ft (upper)" temp={up.tempF} wind={up.windMph} dir={up.windDirDeg} />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <Stat k="Inversion (30 ft minus 5 ft)" v={`${d.inversionF.toFixed(1)}°F`} />
        <Stat k="Wind speed difference" v={`${d.speedShearMph.toFixed(1)} mph`} />
        <Stat k="Wind direction difference" v={`${d.dirShearDeg.toFixed(0)}°`} />
        <Stat k="Delta T" v={`${d.deltaTC.toFixed(1)}°C`} />
        <Stat k="Humidity" v={`${d.rhPct.toFixed(0)}%`} />
        <Stat k="Gusts" v={`${w.gustMph.toFixed(0)} mph`} />
        <Stat k="Rain" v={`${w.rainInHr.toFixed(2)} in/hr`} />
        <Stat k="Cloud" v={`${w.cloudPct.toFixed(0)}%`} />
        <Stat k="Pressure" v={`${w.pressureHpa.toFixed(1)} hPa (${w.pressureTrendHpaPerHr.toFixed(1)}/hr)`} />
        <Stat k="Sun elevation" v={`${frame.sun.elevationDeg.toFixed(0)}°`} />
      </div>
    </Card>
  );
}
