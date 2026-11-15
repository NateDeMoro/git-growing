"use client";
// Forecast tab layout. Use when: composing the Forecast tab.
import { useEffect } from "react";
import { useUiData } from "./ui/UiData";
import EarlyWarningBanner from "./EarlyWarningBanner";
import ForecastStrip from "./ForecastStrip";
import NextWindowCard from "./NextWindowCard";
import WindowDial from "./WindowDial";

export default function ForecastPanel() {
  const { forecast, loadForecast } = useUiData();
  useEffect(() => loadForecast(), [loadForecast]);
  if (forecast.frames.length === 0) return <div className="p-6 text-muted">Loading forecast...</div>;
  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 p-4">
      <EarlyWarningBanner />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ForecastStrip />
        <div className="space-y-4">
          <NextWindowCard />
          <WindowDial />
        </div>
      </div>
    </div>
  );
}
