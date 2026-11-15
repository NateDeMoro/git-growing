"use client";
// 3D orchard map. PLACEHOLDER with the final props; W7 replaces the body.
// Use when: rendering the current frame in 3D.
import type { Assessment, SceneFrame } from "@/lib/contract";

export interface Scene3DProps {
  frame: SceneFrame;
  assessment: Assessment;
}

export default function Scene3D({ frame, assessment }: Scene3DProps) {
  const lower = frame.layers.find((l) => l.heightFt === 5);
  const upper = frame.layers.find((l) => l.heightFt === 30);
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-300">
      <div className="space-y-1 text-center">
        <div className="text-base font-semibold text-slate-100">3D scene placeholder</div>
        <div>
          5 ft {lower?.tempF.toFixed(1)}°F {lower?.windMph.toFixed(1)} mph · 30 ft {upper?.tempF.toFixed(1)}°F{" "}
          {upper?.windMph.toFixed(1)} mph
        </div>
        <div>
          Inversion {frame.derived.inversionF.toFixed(1)}°F · status {assessment.status}
        </div>
      </div>
    </div>
  );
}
