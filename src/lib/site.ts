// The one fixed farm: UA Yuma Mesa Farm. Use when: any piece needs the tower point, farm outline or blocks.
// Traced by W7 from Esri World Imagery (z16); farm ~236 ac. Block names are labels, not imagery text.
import type { Site } from "./contract";

export const SITE: Site = {
  name: "UA Yuma Mesa Farm",
  address: "2176 W County 15th St, Somerton, AZ 85350",
  crop: "citrus",
  timezone: "America/Phoenix",
  tower: { lat: 32.606718, lon: -114.636798 },
  farmOutline: [[-114.641132,32.611128],[-114.632549,32.611128],[-114.632549,32.600391],[-114.641132,32.600391]],
  blocks: [
    { id: "A", name: "Block A", polygon: [[-114.638987,32.611056],[-114.636884,32.611056],[-114.636884,32.609465],[-114.638987,32.609465]], rowBearingDeg: 0 }, // 8.6 ac
    { id: "B", name: "Block B", polygon: [[-114.641047,32.609321],[-114.63903,32.609321],[-114.63903,32.608526],[-114.641047,32.608526]], rowBearingDeg: 0 }, // 4.1 ac
    { id: "C", name: "Block C", polygon: [[-114.636734,32.609375],[-114.635854,32.609375],[-114.635854,32.607658],[-114.636734,32.607658]], rowBearingDeg: 0 }, // 3.9 ac
    { id: "D", name: "Block D", polygon: [[-114.635682,32.609375],[-114.634674,32.609375],[-114.634674,32.607658],[-114.635682,32.607658]], rowBearingDeg: 0 }, // 4.4 ac
    { id: "E", name: "Block E", polygon: [[-114.636734,32.607604],[-114.635768,32.607604],[-114.635768,32.60585],[-114.636734,32.60585]], rowBearingDeg: 0 }, // 4.3 ac
    { id: "F", name: "Block F", polygon: [[-114.635682,32.607604],[-114.634695,32.607604],[-114.634695,32.60585],[-114.635682,32.60585]], rowBearingDeg: 0 }, // 4.4 ac
    { id: "G", name: "Block G", polygon: [[-114.641047,32.605796],[-114.637914,32.605796],[-114.637914,32.604007],[-114.641047,32.604007]], rowBearingDeg: 0 }, // 14.4 ac
    { id: "H", name: "Block H", polygon: [[-114.638922,32.602109],[-114.632549,32.602109],[-114.632549,32.601295],[-114.638922,32.601295]], rowBearingDeg: 90 }, // 13.3 ac
    { id: "J", name: "Block J", polygon: [[-114.638815,32.601205],[-114.632549,32.601205],[-114.632549,32.600391],[-114.638815,32.600391]], rowBearingDeg: 90 }, // 13.1 ac
  ],
  defaultBlockId: "E",
  azmetStationId: "az36",
};
