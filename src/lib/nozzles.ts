// Droplet class -> nozzle advice (type, ISO 10625 size/color, pressure range, sources). Data in data/nozzles.json.
// Starting points only: confirm with your nozzle chart and the product label.
import type { DropletClass } from "./contract";
import nozzlesJson from "../../data/nozzles.json";

export interface NozzleSource {
  id: string;
  title: string;
  url: string;
}

export interface NozzleAdvice {
  type: string;
  model: string;
  isoSize: string;
  isoColor: string;
  psiMin: number;
  psiMax: number;
  sources: NozzleSource[];
}

interface Row {
  type: string;
  model: string;
  isoSize: string;
  isoColor: string;
  psiMin: number;
  psiMax: number;
}

const SOURCES_BY_ID: Record<string, NozzleSource> = Object.fromEntries(
  (nozzlesJson.sources as NozzleSource[]).map((s) => [s.id, s]),
);
// Every row comes from the TeeJet chart; size/color from the ISO 10625 code; type context from WSU.
const ROW_SOURCES = ["teejetAirBlast", "albuzAti", "iso10625"].map((id) => SOURCES_BY_ID[id]);

/** Use when: showing what to fit for a recommended droplet class. Returns [] when no chart supports the class (show the class only). */
export function nozzlesFor(c: DropletClass | null): NozzleAdvice[] {
  if (c === null) return [];
  const rows = (nozzlesJson.classes as Partial<Record<DropletClass, Row[]>>)[c] ?? [];
  return rows.map((r) => ({ ...r, sources: ROW_SOURCES }));
}

/** Use when: you need only the first (preferred) choice. */
export function topNozzle(c: DropletClass | null): NozzleAdvice | null {
  return nozzlesFor(c)[0] ?? null;
}

/** Use when: formatting a pressure range, e.g. "100-160 psi". */
export function psiText(n: Pick<NozzleAdvice, "psiMin" | "psiMax">): string {
  return `${n.psiMin}–${n.psiMax} psi`;
}

/** Use when: a short log/CSV label, e.g. "AITXA/AITXB 8003-VK blue (03) 100-160 psi". Empty string when none. */
export function nozzleLabel(c: DropletClass | null): string {
  const n = topNozzle(c);
  return n ? `${n.model.replace(/^TeeJet /, "")} ${n.isoColor} (${n.isoSize}) ${psiText(n)}` : "";
}
