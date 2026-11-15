"use client";
// Nozzle card: what to fit (type, ISO 10625 color/size, pressure) for the finest safe droplet class, or "No nozzle makes this safe".
// Use when: telling the applicator what nozzle setup to use. Falls back to the droplet class alone when no chart supports it.
import { DROPLETS, dropletInfo } from "@/lib/droplets";
import { nozzlesFor, psiText } from "@/lib/nozzles";
import { useUiData } from "./ui/UiData";
import { Card } from "./ui/shared";

export default function DropletAdvice() {
  const { assessment, product } = useUiData();
  const rec = assessment.recommendedDroplet;
  const options = nozzlesFor(rec);
  const top = options[0];
  return (
    <Card title="Nozzle to fit">
      {rec === null ? (
        <div className="rounded-lg border-2 border-stop bg-stop/15 p-3 text-lg font-bold text-stop">
          No nozzle makes this safe. Wait.
          <div className="mt-1 text-sm font-normal text-foreground">{assessment.dropletNote}</div>
        </div>
      ) : (
        <>
          {top ? (
            <p className="text-lg font-bold">
              Fit {top.type} nozzles, ISO {top.isoColor} ({top.isoSize}) or larger, at {psiText(top)}
            </p>
          ) : (
            <p className="text-lg font-bold">
              Use {dropletInfo(rec).name} droplets or coarser: {dropletInfo(rec).howToGet}
            </p>
          )}
          <p className="mt-1 text-sm">
            {top ? "This gives " : "Target: "}
            <span className="font-mono font-black text-go">{rec}</span> ({dropletInfo(rec).name}) droplets, the finest class that is safe right now.
          </p>
          {options.length > 1 && (
            <p className="mt-1 text-sm text-muted">
              Or: {options[1].type}, ISO {options[1].isoColor} ({options[1].isoSize}) or larger, at {psiText(options[1])}.
            </p>
          )}
          <p className="mt-1 text-sm text-muted">Tradeoff: coarser droplets drift less but cover the leaf less evenly; use the finest class that stays safe.</p>
          <p className="mt-1 text-xs text-muted">Starting point: confirm with your nozzle chart and the product label.</p>
          {top && (
            <p className="mt-1 text-xs text-muted">
              Source:{" "}
              <a className="underline" href={top.sources[0].url} target="_blank" rel="noreferrer">{top.model}</a>
            </p>
          )}
        </>
      )}
      <div className="mt-3 flex flex-wrap gap-1">
        {DROPLETS.map((d) => {
          const on = d.id === rec;
          const isMin = d.id === product.labelMinDroplet;
          return (
            <span
              key={d.id}
              title={d.name}
              className={`rounded border px-1.5 py-0.5 font-mono text-xs font-bold ${on ? "border-go bg-go/20 text-go" : "border-line text-muted"}`}
            >
              {d.id}
              {isMin && <span className="ml-1 text-[9px] font-normal text-caution">label min</span>}
            </span>
          );
        })}
      </div>
    </Card>
  );
}
