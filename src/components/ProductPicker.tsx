"use client";
// Compact product bar (bottom of the Now tab): dropdown plus volatility, label wind max and min droplet. Use when: choosing the sprayed product.
import { PRODUCTS } from "@/lib/products";
import { useUiData } from "./ui/UiData";

export default function ProductPicker() {
  const { product, productId, setProductId } = useUiData();
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line bg-panel px-4 py-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted">Product</span>
      <select
        value={productId}
        onChange={(e) => { setProductId(e.target.value); e.currentTarget.blur(); }}
        className="rounded-lg border border-line bg-panel2 px-3 py-1.5 text-base text-foreground"
        aria-label="Product"
      >
        {PRODUCTS.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <span className="rounded border border-line px-2 py-0.5">Volatility: <b className={product.volatility === "high" ? "text-stop" : product.volatility === "moderate" ? "text-caution" : "text-go"}>{product.volatility}</b></span>
      <span className="rounded border border-line px-2 py-0.5">Wind max {product.labelWindMaxMph} mph</span>
      <span className="rounded border border-line px-2 py-0.5">Min droplet {product.labelMinDroplet}</span>
      <span className="rounded border border-caution/60 px-2 py-0.5 text-caution">check label</span>
      {product.note && <span className="min-w-0 flex-1 truncate text-xs text-muted" title={product.note}>{product.note}</span>}
    </div>
  );
}
