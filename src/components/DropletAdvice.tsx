"use client";
// Recommended droplet class, how to get it, coverage tradeoff, or the "nothing makes this safe" state.
// Use when: telling the applicator what nozzle setup to use.
import { DROPLETS, dropletInfo } from "@/lib/droplets";
import { useUiData } from "./ui/UiData";
import { Card } from "./ui/shared";

export default function DropletAdvice() {
  const { assessment, product } = useUiData();
  const rec = assessment.recommendedDroplet;
  return (
    <Card title="Droplet size (ASABE S572.3)">
      {rec === null ? (
        <div className="rounded-lg border-2 border-stop bg-stop/15 p-3 text-lg font-bold text-stop">
          No droplet size makes this safe.
          <div className="mt-1 text-sm font-normal text-foreground">{assessment.dropletNote}</div>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-5xl font-black text-go">{rec}</span>
            <span className="text-lg">{dropletInfo(rec).name} or larger</span>
          </div>
          <p className="mt-1 text-sm text-muted">How: {dropletInfo(rec).howToGet}.</p>
          <p className="mt-1 text-sm text-muted">Tradeoff: coarser droplets drift less but cover the leaf less evenly; use the finest class that stays safe.</p>
        </>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {DROPLETS.map((d) => {
          const on = d.id === rec;
          const isMin = d.id === product.labelMinDroplet;
          return (
            <span
              key={d.id}
              title={d.name}
              className={`rounded-md border px-2 py-1 font-mono text-sm font-bold ${on ? "border-go bg-go/20 text-go" : "border-line text-muted"}`}
            >
              {d.id}
              {isMin && <span className="ml-1 text-[10px] font-normal text-caution">label min</span>}
            </span>
          );
        })}
      </div>
    </Card>
  );
}
