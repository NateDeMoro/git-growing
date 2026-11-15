"use client";
// Forecast tab layout. Use when: composing the Forecast tab.
import { useEffect } from "react";
import { useUiData } from "./ui/UiData";
import EarlyWarningBanner from "./EarlyWarningBanner";
import ForecastStrip from "./ForecastStrip";
import NextWindowCard from "./NextWindowCard";
import ForecastChart from "./ForecastChart";
import WindowDial from "./WindowDial";

export default function ForecastPanel() {
  const { forecast, loadForecast, forecastFailed } = useUiData();
  useEffect(() => loadForecast(), [loadForecast]);
  if (forecast.frames.length === 0) {
    return <div className="p-6 text-muted">{forecastFailed ? "Forecast unavailable. No cached or sim data to show." : "Loading forecast..."}</div>;
  }
  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 p-4">
      {forecastFailed && (
        <div className="rounded-xl border border-caution/60 bg-caution/10 p-3 text-sm text-caution">
          Forecast unavailable: showing cached/sim data.
        </div>
      )}
      <EarlyWarningBanner />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ForecastStrip />
        <div className="space-y-4">
          <NextWindowCard />
          <WindowDial />
        </div>
      </div>
      <ForecastChart />
    </div>
  );
}
