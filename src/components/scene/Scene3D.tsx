"use client";
// 3D orchard map wrapper (client-only dynamic import of SceneMap). Use when: rendering the current frame in 3D.
// Props beyond frame/assessment are optional: controlsRef (flyToOverview / toggle2D / preset), focusedBlockId + onFocusBlock, spraying.
import dynamic from "next/dynamic";
import type { MutableRefObject } from "react";
import type { Assessment, SceneFrame } from "@/lib/contract";

export interface SceneControls {
  flyToOverview: () => void;
  toggle2D: () => void;
  preset: (p: "overview" | "side" | "top") => void;
}

export interface Scene3DProps {
  frame: SceneFrame;
  assessment: Assessment;
  controlsRef?: MutableRefObject<SceneControls | null>;
  focusedBlockId?: string;
  onFocusBlock?: (id: string) => void;
  spraying?: boolean; // default true
}

const SceneMap = dynamic(() => import("./SceneMap"), {
  ssr: false,
  loading: () => <div className="h-full min-h-[420px] rounded-xl border border-slate-700 bg-slate-950" />,
});

export default function Scene3D(props: Scene3DProps) {
  return <SceneMap {...props} />;
}
