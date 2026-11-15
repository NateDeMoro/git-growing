"use client";
// Now tab layout: Scene3D slot left (~60%), scrolling right column, charts strip + playback bar at the bottom.
// Use when: composing the Now tab. The slot is a single child so W7 keeps the Scene3D props.
import dynamic from "next/dynamic";
import { useUiStore, uiActions } from "@/lib/uiStore";
import { useUiData } from "./ui/UiData";
import DropletAdvice from "./DropletAdvice";
import EarlyWarningBanner from "./EarlyWarningBanner";
import MastSVG from "./MastSVG";
import PlaybackBar from "./PlaybackBar";
import ProductPicker from "./ProductPicker";
import ReadingsCard from "./ReadingsCard";
import ReasonList from "./ReasonList";
import StationCompare from "./StationCompare";
import StatusCard from "./StatusCard";
import TowerChart from "./TowerChart";
import WhyLimits from "./WhyLimits";
import WindChart from "./WindChart";
import WindCompass from "./WindCompass";

const Scene3D = dynamic(() => import("./scene/Scene3D"), { ssr: false });

export default function NowPanel() {
  const { frame, assessment, lookAhead } = useUiData();
  const collapsed = useUiStore((s) => s.chartsCollapsed);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[3fr_2fr]">
        <div className="min-h-[420px] min-w-0 lg:sticky lg:top-4 lg:h-[calc(100vh-290px)]">
          <Scene3D frame={frame} assessment={assessment} />
        </div>
        <div className="min-w-0 space-y-4 lg:max-h-[calc(100vh-290px)] lg:overflow-y-auto lg:pr-1">
          <StatusCard />
          {lookAhead && <EarlyWarningBanner compact />}
          <ReasonList />
          <ReadingsCard />
          <DropletAdvice />
          <StationCompare />
          <ProductPicker />
          <div className="grid gap-4 sm:grid-cols-2">
            <MastSVG />
            <WindCompass />
          </div>
          <WhyLimits />
        </div>
      </div>
      <div className="border-t border-line bg-panel">
        <div className="flex items-center justify-between px-4 py-1">
          <span className="text-xs uppercase tracking-widest text-muted">Charts</span>
          <button onClick={uiActions.toggleCharts} className="text-xs text-muted hover:text-foreground">{collapsed ? "Show charts" : "Hide charts"}</button>
        </div>
        {!collapsed && (
          <div className="grid gap-4 px-4 pb-2 md:grid-cols-2">
            <TowerChart />
            <WindChart />
          </div>
        )}
      </div>
      <PlaybackBar />
    </div>
  );
}
