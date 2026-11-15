// Pesticide products for the picker. Use when: the user picks a product or the engine needs volatility/label limits.
// Data lives in data/products.json, built from PubChem by scripts/fetch-products.ts (npm run fetch:products).
import type { Product } from "./contract";
import productsJson from "../../data/products.json";

export const PRODUCTS: Product[] = productsJson as Product[];

export const DEFAULT_PRODUCT_ID = PRODUCTS[0].id;

export function productById(id: string): Product {
  return PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];
}
