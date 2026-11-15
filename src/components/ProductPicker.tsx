"use client";
// Product dropdown with volatility band, label limits and the "check label" flag. Use when: choosing the sprayed product.
import { PRODUCTS } from "@/lib/products";
import { useUiData } from "./ui/UiData";
import { Card } from "./ui/shared";

export default function ProductPicker() {
  const { product, productId, setProductId } = useUiData();
  return (
    <Card title="Product">
      <select
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        className="w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-base text-foreground"
        aria-label="Product"
      >
        {PRODUCTS.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded border border-line px-2 py-0.5">Volatility: <b className={product.volatility === "high" ? "text-stop" : product.volatility === "moderate" ? "text-caution" : "text-go"}>{product.volatility}</b></span>
        <span className="rounded border border-line px-2 py-0.5">Wind max {product.labelWindMaxMph} mph</span>
        <span className="rounded border border-line px-2 py-0.5">Min droplet {product.labelMinDroplet}</span>
        <span className="rounded border border-caution/60 px-2 py-0.5 text-caution">check label</span>
      </div>
      {product.note && <p className="mt-2 text-xs text-muted">{product.note}</p>}
    </Card>
  );
}
