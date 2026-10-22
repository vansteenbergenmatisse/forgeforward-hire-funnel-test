/**
 * Applicant retention rules (FUNNEL_SPEC Part F). Pure, so they are easy to test.
 *
 * Applicants that sit in a non-positive stage (New, Did task, Rejected, any custom stage without "Keep videos"),
 * or that never finished the funnel, are deleted completely 30 days after their last stage change.
 * Applicants in a positive stage (Interview booked, Interviewed, Trial, Hired, or any stage that keeps videos) are never deleted.
 */
export const APPLICANT_RETENTION_DAYS = 30;
/** Same number under its older name. */
export const RETENTION_DAYS = APPLICANT_RETENTION_DAYS;
export const WARNING_FROM_DAY = 25;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RetentionSubject = {
  createdAt: Date;
  completedAt?: Date | null;
  /** Column value, set on every move. */
  lastStageChangeAt?: Date | null;
  /** Time of the latest stage_changed event. */
  lastStageEventAt?: Date | null;
  /** null when the applicant has no stage (Did not finish). */
  stageIsPositive: boolean | null;
};

export function retentionCutoff(now: Date): Date {
  return new Date(now.getTime() - APPLICANT_RETENTION_DAYS * DAY_MS);
}

/**
 * Start of the 30 day clock: the latest stage change, or the time the applicant finished or was created when no change was recorded.
 * The latest of these wins, so a fresh move into Rejected always gives 30 more days.
 */
export function retentionClock(s: Pick<RetentionSubject, "createdAt" | "completedAt" | "lastStageChangeAt" | "lastStageEventAt">): Date {
  const times = [s.createdAt, s.completedAt, s.lastStageChangeAt, s.lastStageEventAt].filter((d): d is Date => d instanceof Date);
  return new Date(Math.max(...times.map((d) => d.getTime())));
}

/** Every R2 key the applicant owns. Empty strings and nulls are skipped. */
export function mediaKeys(s: { videoKey: string | null; thumbKey: string | null; taskFileKey: string | null }): string[] {
  return [s.videoKey, s.thumbKey, s.taskFileKey].filter((k): k is string => Boolean(k));
}

/**
 * R2 folders owned by one applicant, taken from their known keys. A folder counts only when its last segment is the
 * applicant id, so a wrong key can never widen a delete to someone else's files.
 */
export function applicantFolders(applicantId: string, keys: string[]): string[] {
  const folders = new Set<string>();
  for (const key of keys) {
    const folder = key.slice(0, key.lastIndexOf("/") + 1);
    if (folder.endsWith(`/${applicantId}/`)) folders.add(folder);
  }
  return [...folders];
}

/**
 * The three folders an applicant can upload into (`<prefix>videos|thumbs|tasks/<slug>/<applicantId>/`).
 * Used for applicants with no stored keys, whose abandoned uploads would otherwise stay in R2.
 * Returns nothing when the id or slug could widen the prefix beyond that one applicant.
 */
export function ownFolders(prefix: string, slug: string, applicantId: string): string[] {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicantId)) return [];
  if (!/^[\w-]+$/.test(slug)) return [];
  return (["videos", "thumbs", "tasks"] as const).map((kind) => `${prefix}${kind}/${slug}/${applicantId}/`);
}

/**
 * True when the applicant must be deleted completely: no positive stage (no stage counts as not positive)
 * and more than 30 days since the last stage change. Exactly 30 days is still kept.
 */
export function isRetentionEligible(s: RetentionSubject, now: Date): boolean {
  if (s.stageIsPositive === true) return false;
  return retentionClock(s).getTime() < retentionCutoff(now).getTime();
}

/** Whole days left before deletion. null before day 25 or for protected applicants. */
export function daysUntilDeletion(s: RetentionSubject, now: Date): number | null {
  if (s.stageIsPositive === true) return null;
  const ageDays = Math.floor((now.getTime() - retentionClock(s).getTime()) / DAY_MS);
  if (ageDays < WARNING_FROM_DAY) return null;
  return Math.max(0, APPLICANT_RETENTION_DAYS - ageDays);
}
