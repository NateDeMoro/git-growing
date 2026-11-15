"use client";
// Live/Simulate toggle, play/pause, speed, scrubber with beat markers, next beat. Use when: driving the sim playhead.
// State and actions live in uiStore; W6 backs the playhead with week.json.
import { SPEEDS, uiActions, useUiStore } from "@/lib/uiStore";
import { useUiData } from "./ui/UiData";
import { dayClock } from "./ui/shared";

export default function PlaybackBar() {
  const mode = useUiStore((s) => s.mode);
  const playing = useUiStore((s) => s.playing);
  const speed = useUiStore((s) => s.speed);
  const playhead = useUiStore((s) => s.playhead);
  const frameCount = useUiStore((s) => s.frameCount);
  const beats = useUiStore((s) => s.beats);
  const { frame } = useUiData();
  const last = Math.max(1, frameCount - 1);
  const btn = "rounded-md border px-3 py-1.5 text-sm font-semibold";
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line bg-panel px-4 py-1.5">
      <div className="flex overflow-hidden rounded-md border border-line" role="group" aria-label="Mode">
        {(["live", "sim"] as const).map((m) => (
          <button key={m} onClick={() => uiActions.setMode(m)} className={`px-3 py-1.5 text-sm font-semibold ${mode === m ? "bg-go/20 text-go" : "text-muted hover:text-foreground"}`}>
            {m === "live" ? "Live" : "Simulate"}
          </button>
        ))}
      </div>
      <button onClick={uiActions.togglePlay} className={`${btn} w-20 border-line ${playing ? "text-caution" : "text-go"}`}>
        {playing ? "Pause" : "Play"}
      </button>
      <div className="flex gap-1" role="group" aria-label="Speed in sim-hours per second">
        {SPEEDS.map((s) => (
          <button key={s} onClick={() => uiActions.setSpeed(s)} className={`${btn} ${speed === s ? "border-go text-go" : "border-line text-muted"}`}>
            {s}x
          </button>
        ))}
        <span className="self-center pl-1 text-xs text-muted">sim-h/s</span>
      </div>
      <div className="relative min-w-[200px] flex-1">
        <input
          type="range"
          min={0}
          max={last}
          step={0.01}
          value={playhead}
          disabled={mode === "live"}
          onChange={(e) => uiActions.setPlayhead(Number(e.target.value))}
          className="w-full accent-green-400"
          aria-label="Sim time"
        />
        <div className="relative h-7">
          {beats.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={(e) => {
                uiActions.jumpToBeat(i);
                e.currentTarget.blur();
              }}
              title={`Beat ${b.id}: ${b.label}`}
              aria-label={`Beat ${b.id}: ${b.label}`}
              className="absolute top-0 min-h-7 min-w-6 -translate-x-1/2 cursor-pointer rounded px-1 text-center text-[11px] font-bold leading-tight text-caution hover:bg-caution/20 hover:text-foreground focus-visible:bg-caution/20 focus-visible:outline focus-visible:outline-1 focus-visible:outline-caution"
              style={{ left: `${(b.frameIndex / last) * 100}%` }}
            >
              |<br />{b.id}
            </button>
          ))}
        </div>
      </div>
      <button onClick={uiActions.nextBeat} className={`${btn} border-line text-sky-300`}>Next beat</button>
      <div className="font-mono text-sm text-muted">{dayClock(frame.time)}</div>
    </div>
  );
}
