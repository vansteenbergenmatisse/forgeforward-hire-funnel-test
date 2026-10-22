/** Video retention rules (FUNNEL_SPEC Part F). Pure, so they are easy to test. */
export const RETENTION_DAYS = 30;
export const WARNING_FROM_DAY = 25;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RetentionSubject = {
  createdAt: Date;
  /** null when the applicant has no stage (Did not finish). */
  stageIsPositive: boolean | null;
  videoDeletedAt: Date | null;
  videoKey: string | null;
  thumbKey: string | null;
  taskFileKey: string | null;
};

export function retentionCutoff(now: Date): Date {
  return new Date(now.getTime() - RETENTION_DAYS * DAY_MS);
}

/** Every R2 key the applicant owns. Empty strings and nulls are skipped. */
export function mediaKeys(s: Pick<RetentionSubject, "videoKey" | "thumbKey" | "taskFileKey">): string[] {
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
 * Older than 30 days, not in a positive stage, files not yet deleted. No stage counts as not positive.
 * Applicants without a stored key are included: their abandoned uploads are swept by folder, then they are marked done.
 */
export function isRetentionEligible(s: RetentionSubject, now: Date): boolean {
  if (s.videoDeletedAt) return false;
  if (s.stageIsPositive === true) return false;
  return s.createdAt.getTime() < retentionCutoff(now).getTime();
}

/** Whole days left before deletion. null before day 25, after deletion, or for protected cards. */
export function daysUntilDeletion(s: Pick<RetentionSubject, "createdAt" | "stageIsPositive" | "videoDeletedAt">, now: Date): number | null {
  if (s.videoDeletedAt || s.stageIsPositive === true) return null;
  const ageDays = Math.floor((now.getTime() - s.createdAt.getTime()) / DAY_MS);
  if (ageDays < WARNING_FROM_DAY) return null;
  return Math.max(0, RETENTION_DAYS - ageDays);
}
