// Pesticide products for the picker. Use when: the user picks a product or the engine needs volatility/label limits.
// STUB: W1 replaces PRODUCTS with data/products.json built from PubChem by scripts/fetch-products.ts.
import type { Product } from "./contract";

export const PRODUCTS: Product[] = [
  {
    id: "abamectin",
    name: "Abamectin",
    pubchemCid: 6918460,
    vaporPressureMpa: 0.0000037,
    volatility: "low",
    labelWindMaxMph: 10,
    labelMinDroplet: "VF",
    note: "Label limits illustrative, check label",
  },
  {
    id: "high-vol-example",
    name: "High-volatility example (placeholder)",
    vaporPressureMpa: 20,
    volatility: "high",
    labelWindMaxMph: 10,
    labelMinDroplet: "M",
    note: "Placeholder until W1 picks a real product over 10 mPa",
    isHighVolatilityExample: true,
  },
];

export const DEFAULT_PRODUCT_ID = PRODUCTS[0].id;

export function productById(id: string): Product {
  return PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];
}
