// Colours for the scene. Use when: mapping status or temperature to RGB(A) arrays.
import type { Status } from "../contract";

export type RGB = [number, number, number];
export const STATUS_RGB: Record<Status, RGB> = { GO: [34, 197, 94], CAUTION: [245, 158, 11], STOP: [239, 68, 68] };

const RAMP: RGB[] = [[60, 120, 255], [90, 200, 240], [250, 235, 160], [255, 160, 60], [255, 90, 40]];

/** Cool blue to warm orange across [min,max]. */
export function tempColor(t: number, min: number, max: number): RGB {
  const k = max - min < 0.01 ? 0.5 : Math.min(1, Math.max(0, (t - min) / (max - min)));
  const f = k * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(f));
  const u = f - i;
  return [0, 1, 2].map((c) => Math.round(RAMP[i][c] + (RAMP[i + 1][c] - RAMP[i][c]) * u)) as RGB;
}

export function tempRamp(): string {
  return `linear-gradient(to top, ${RAMP.map((c) => `rgb(${c.join(",")})`).join(",")})`;
}

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export function compass(deg: number): string {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}
