// ANSI/ASABE S572.3 droplet classes, finest to coarsest. Use when: recommending a droplet size.
import type { DropletClass } from "./contract";

export interface DropletInfo {
  id: DropletClass;
  name: string;
  howToGet: string;
}

export const DROPLETS: DropletInfo[] = [
  { id: "XF", name: "Extremely Fine", howToGet: "fine hollow-cone nozzles at high pressure" },
  { id: "VF", name: "Very Fine", howToGet: "standard airblast hollow-cone nozzles" },
  { id: "F", name: "Fine", howToGet: "hollow-cone nozzles at moderate pressure" },
  { id: "M", name: "Medium", howToGet: "larger orifice or lower pressure" },
  { id: "C", name: "Coarse", howToGet: "air-induction nozzles or lower pressure" },
  { id: "VC", name: "Very Coarse", howToGet: "air-induction nozzles at low pressure" },
  { id: "XC", name: "Extremely Coarse", howToGet: "large air-induction nozzles at low pressure" },
  { id: "UC", name: "Ultra Coarse", howToGet: "largest air-induction nozzles at minimum pressure" },
];

export const DROPLET_ORDER: DropletClass[] = DROPLETS.map((d) => d.id);

export function dropletIndex(c: DropletClass): number {
  return DROPLET_ORDER.indexOf(c);
}

export function dropletInfo(c: DropletClass): DropletInfo {
  return DROPLETS[dropletIndex(c)];
}
