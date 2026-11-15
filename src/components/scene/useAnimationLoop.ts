"use client";
// One rAF loop capped at ~30 updates/s, paused when the tab is hidden. Use when: driving particles and easing.
import { useEffect, useRef } from "react";

export function useAnimationLoop(cb: (dtS: number, tS: number) => void, fps = 30) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const t0 = last;
    const step = 1000 / fps;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) { last = now; return; }
      const el = now - last;
      if (el < step) return;
      last = now;
      ref.current(Math.min(el, 100) / 1000, (now - t0) / 1000);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [fps]);
}
