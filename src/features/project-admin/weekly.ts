const WEEK_MS = 7 * 86_400_000;

/** Applicants who started in the 7 days before `now`. */
export function startedThisWeek(createdAts: string[], now: Date): number {
  const from = now.getTime() - WEEK_MS;
  return createdAts.filter((c) => {
    const t = new Date(c).getTime();
    return t > from && t <= now.getTime();
  }).length;
}
