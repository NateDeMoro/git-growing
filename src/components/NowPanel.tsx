"use client";
// Now tab layout (fits one screen): Scene3D left (~60%), right column (verdict bar, reasons, droplets, readings), bottom product + playback bars.
// Use when: composing the Now tab. The slot is a single child so W7 keeps the Scene3D props.
import dynamic from "next/dynamic";
import { useUiData } from "./ui/UiData";
import DropletAdvice from "./DropletAdvice";
import PlaybackBar from "./PlaybackBar";
import ProductPicker from "./ProductPicker";
import ReadingsCard from "./ReadingsCard";
import ReasonList from "./ReasonList";
import StatusCard from "./StatusCard";

const Scene3D = dynamic(() => import("./scene/Scene3D"), { ssr: false });

export default function NowPanel() {
  const { frame, assessment } = useUiData();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[3fr_2fr]">
        <div className="min-h-[420px] min-w-0 lg:h-full lg:min-h-0">
          <Scene3D frame={frame} assessment={assessment} />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto pr-1">
          <StatusCard />
          <ReasonList />
          <DropletAdvice />
          <ReadingsCard />
        </div>
      </div>
      <ProductPicker />
      <PlaybackBar />
    </div>
  );
}
