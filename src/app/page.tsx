"use client";
// Single page with Now / Forecast / Log tabs. W4 owns the 2D panels; UiDataProvider supplies live, sim and forecast data.
import { useState } from "react";
import { FrameProvider } from "@/components/FrameProvider";
import DemoPanel from "@/components/DemoPanel";
import ForecastPanel from "@/components/ForecastPanel";
import LogTable from "@/components/LogTable";
import NowPanel from "@/components/NowPanel";
import { UiDataProvider, useUiData } from "@/components/ui/UiData";
import { SITE } from "@/lib/site";

type Tab = "now" | "forecast" | "log";

function Shell() {
  const [tab, setTab] = useState<Tab>("now");
  const { cached, forecast } = useUiData();
  const showCached = tab === "forecast" ? forecast.cached : cached;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-6 py-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Spray or Wait <span className="font-normal text-muted">· by GitGrowing</span>
          </h1>
          <p className="text-sm text-muted">{SITE.name} · {SITE.crop} · Somerton, AZ</p>
        </div>
        {showCached && <span className="rounded-full border border-caution/60 px-3 py-1 text-xs font-semibold text-caution" title="Live source unavailable; showing a committed snapshot">cached data</span>}
        <nav className="flex gap-1" aria-label="Views">
          {(["now", "forecast", "log"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-2 text-base font-semibold capitalize ${tab === t ? "bg-go/20 text-go" : "text-muted hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        {tab === "now" && <NowPanel />}
        {tab === "forecast" && <ForecastPanel />}
        {tab === "log" && <LogTable />}
      </main>
      <DemoPanel />
    </div>
  );
}

export default function Page() {
  return (
    <FrameProvider>
      <UiDataProvider>
        <Shell />
      </UiDataProvider>
    </FrameProvider>
  );
}
