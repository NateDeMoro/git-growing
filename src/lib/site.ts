// The one fixed farm: UA Yuma Mesa Farm. Use when: any piece needs the tower point, farm outline or blocks.
// PLACEHOLDER until W7 traces the real farm and blocks from Esri imagery.
import type { Site } from "./contract";

export const SITE: Site = {
  name: "UA Yuma Mesa Farm",
  address: "2176 W County 15th St, Somerton, AZ 85350",
  crop: "citrus",
  timezone: "America/Phoenix",
  tower: { lat: 32.61, lon: -114.64 },
  farmOutline: [
    [-114.6455, 32.6145],
    [-114.6345, 32.6145],
    [-114.6345, 32.6055],
    [-114.6455, 32.6055],
  ],
  blocks: [
    {
      id: "A",
      name: "Block A",
      polygon: [
        [-114.6445, 32.6135],
        [-114.6405, 32.6135],
        [-114.6405, 32.6105],
        [-114.6445, 32.6105],
      ],
      rowBearingDeg: 0,
    },
  ],
  defaultBlockId: "A",
  azmetStationId: "az36",
};
