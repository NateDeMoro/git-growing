"use client";
// Single page with Now / Forecast / Log tabs. W4 fills the panels; W6 wires data.
import dynamic from "next/dynamic";
import { useState } from "react";
import { FrameProvider, useFrame } from "@/components/FrameProvider";

const Scene3D = dynamic(() => import("@/components/scene/Scene3D"), { ssr: false });

type Tab = "now" | "forecast" | "log";

function Shell() {
  const [tab, setTab] = useState<Tab>("now");
  const { frame, assessment } = useFrame();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50">
            Spray or Wait <span className="font-normal text-slate-400">· by GitGrowing</span>
          </h1>
          <p className="text-xs text-slate-400">UA Yuma Mesa Farm · citrus · Somerton, AZ</p>
        </div>
        <nav className="flex gap-1">
          {(["now", "forecast", "log"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize ${
                tab === t ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-4">
        {tab === "now" && (
          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <Scene3D frame={frame} assessment={assessment} />
            <div className="rounded-xl border border-slate-700 p-4 text-slate-200">Status: {assessment.status}</div>
          </div>
        )}
        {tab === "forecast" && <div className="text-slate-300">Forecast coming soon</div>}
        {tab === "log" && <div className="text-slate-300">Log coming soon</div>}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <FrameProvider>
      <Shell />
    </FrameProvider>
  );
}
