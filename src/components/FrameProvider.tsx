"use client";
// Owns the current frame, assessment and selected product. Use when: any panel or the 3D scene needs the current state.
// Phase 0 serves a mock frame; W6 wires live polling, sim playback and the real engine.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Assessment, SceneFrame } from "@/lib/contract";
import { MOCK_ASSESSMENT, MOCK_FRAME } from "@/lib/mockFrame";
import { DEFAULT_PRODUCT_ID } from "@/lib/products";

export interface FrameState {
  frame: SceneFrame;
  assessment: Assessment;
  stationAssessment: Assessment | null; // single-station mode result
  productId: string;
  setProductId: (id: string) => void;
}

const FrameContext = createContext<FrameState | null>(null);

export function FrameProvider({ children }: { children: ReactNode }) {
  const [productId, setProductId] = useState(DEFAULT_PRODUCT_ID);
  const value = useMemo<FrameState>(
    () => ({ frame: MOCK_FRAME, assessment: MOCK_ASSESSMENT, stationAssessment: null, productId, setProductId }),
    [productId],
  );
  return <FrameContext.Provider value={value}>{children}</FrameContext.Provider>;
}

export function useFrame(): FrameState {
  const v = useContext(FrameContext);
  if (!v) throw new Error("useFrame must be used inside FrameProvider");
  return v;
}
