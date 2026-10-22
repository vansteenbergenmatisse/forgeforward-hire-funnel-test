import type { StageDef } from "@/features/projects";

/** Part F: applicants outside a positive stage are deleted completely 30 days after their last stage change. */
export const RETENTION_DAYS = 30;
/** From this age the card shows "Deletes in X days". */
export const WARN_FROM_DAY = 25;

const DAY_MS = 86_400_000;

type RetentionInput = { createdAt: string; lastStageChangeAt?: string | null; stageId: string | null };

/** The 30 day clock starts at the last stage change, or at creation when the card never moved. */
function clockStart(a: RetentionInput): string {
  const moved = a.lastStageChangeAt ? new Date(a.lastStageChangeAt).getTime() : 0;
  return moved > new Date(a.createdAt).getTime() ? (a.lastStageChangeAt as string) : a.createdAt;
}

export function ageInDays(since: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(since).getTime()) / DAY_MS);
}

export function isPositiveStage(stageId: string | null, stages: StageDef[]): boolean {
  if (stageId === null) return false; // "Did not finish" is never positive
  return stages.find((s) => s.id === stageId)?.isPositive ?? false;
}

/** Days left before the daily job deletes the applicant. `null` when the card sits in a positive stage. */
export function daysUntilDeletion(a: RetentionInput, stages: StageDef[], now: Date): number | null {
  if (isPositiveStage(a.stageId, stages)) return null;
  return Math.max(0, RETENTION_DAYS - ageInDays(clockStart(a), now));
}

/** Days to show in the "Deletes in X days" badge, or `null` before day 25. */
export function videoDeletesInDays(a: RetentionInput, stages: StageDef[], now: Date): number | null {
  const left = daysUntilDeletion(a, stages, now);
  if (left === null) return null;
  return ageInDays(clockStart(a), now) >= WARN_FROM_DAY ? left : null;
}

export function retentionBadgeText(days: number): string {
  return days === 1 ? "Deletes in 1 day" : `Deletes in ${days} days`;
}

/**
 * Moving a card out of a positive stage into one that is not starts the 30 day clock.
 * Returns the days the applicant then has (30), or `null` when no warning is needed.
 */
export function warnOnMoveOutOfPositive(a: RetentionInput, toStageId: string, stages: StageDef[]): number | null {
  if (!isPositiveStage(a.stageId, stages) || isPositiveStage(toStageId, stages)) return null;
  return RETENTION_DAYS;
}
