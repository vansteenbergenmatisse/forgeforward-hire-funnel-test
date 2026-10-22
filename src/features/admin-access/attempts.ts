// Best-effort throttle for the admin key route. State lives in one server instance, so it slows a guessing script
// but is not a hard limit. Failed tries are also written to system_errors by the route.

const WINDOW_MS = 10 * 60_000;
const MAX_FAILURES = 10;
const MAX_TRACKED = 5_000;

const failures = new Map<string, number[]>();

function recent(ip: string, now: number): number[] {
  const list = (failures.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length === 0) failures.delete(ip);
  else failures.set(ip, list);
  return list;
}

export function isBlocked(ip: string, now: number = Date.now()): boolean {
  return recent(ip, now).length >= MAX_FAILURES;
}

export function recordFailure(ip: string, now: number = Date.now()): void {
  if (failures.size >= MAX_TRACKED) failures.clear();
  failures.set(ip, [...recent(ip, now), now]);
}

export function clearFailures(ip: string): void {
  failures.delete(ip);
}

/** First address of x-forwarded-for, else "unknown". */
export function clientIp(forwardedFor: string | null): string {
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}
