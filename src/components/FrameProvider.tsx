"use client";
// Owns the selected product. Use when: a panel needs or changes the product. Frames/assessments live in UiDataProvider.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_PRODUCT_ID } from "@/lib/products";

export interface FrameState {
  productId: string;
  setProductId: (id: string) => void;
}

const FrameContext = createContext<FrameState | null>(null);

export function FrameProvider({ children }: { children: ReactNode }) {
  const [productId, setProductId] = useState(DEFAULT_PRODUCT_ID);
  const value = useMemo<FrameState>(() => ({ productId, setProductId }), [productId]);
  return <FrameContext.Provider value={value}>{children}</FrameContext.Provider>;
}

export function useFrame(): FrameState {
  const v = useContext(FrameContext);
  if (!v) throw new Error("useFrame must be used inside FrameProvider");
  return v;
}
