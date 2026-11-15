// America/Phoenix has no DST (UTC-7 always). Use when: formatting local times for adapters/routes.
const OFFSET_MS = -7 * 3600 * 1000;

/** "YYYY-MM-DDTHH:00" local Phoenix hour containing the given instant. */
export function phoenixHour(d: Date = new Date()): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 13) + ":00";
}

/** "YYYY-MM-DDTHH:MM" local Phoenix time. */
export function phoenixMinute(d: Date = new Date()): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 16);
}

/** Parse a local Phoenix "YYYY-MM-DDTHH:MM" to an instant. */
export function parsePhoenix(s: string): Date {
  return new Date(s.slice(0, 16) + ":00-07:00");
}

export async function fetchJson(url: string, timeoutMs = 4000, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}
