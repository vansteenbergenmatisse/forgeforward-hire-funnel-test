import type { StageDef } from "@/features/projects";
import type { MediaView } from "./types";

/** Part F: videos of cards outside a positive stage are deleted 30 days after the application was created. */
export const RETENTION_DAYS = 30;
/** From this age the card shows "Video deletes in X days". */
export const WARN_FROM_DAY = 25;

const DAY_MS = 86_400_000;

type RetentionInput = { createdAt: string; stageId: string | null; media: MediaView | null };

export function ageInDays(createdAt: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(createdAt).getTime()) / DAY_MS);
}

export function isPositiveStage(stageId: string | null, stages: StageDef[]): boolean {
  if (stageId === null) return false; // "Did not finish" is never positive
  return stages.find((s) => s.id === stageId)?.isPositive ?? false;
}

/**
 * Days left before the daily job deletes the video. `null` when nothing will be deleted:
 * no media, already deleted, or the card sits in a positive stage.
 */
export function daysUntilDeletion(a: RetentionInput, stages: StageDef[], now: Date): number | null {
  if (!a.media || a.media.deletedAt) return null;
  if (isPositiveStage(a.stageId, stages)) return null;
  return Math.max(0, RETENTION_DAYS - ageInDays(a.createdAt, now));
}

/** Days to show in the "Video deletes in X days" badge, or `null` before day 25. */
export function videoDeletesInDays(a: RetentionInput, stages: StageDef[], now: Date): number | null {
  const left = daysUntilDeletion(a, stages, now);
  if (left === null) return null;
  return ageInDays(a.createdAt, now) >= WARN_FROM_DAY ? left : null;
}

export function retentionBadgeText(days: number): string {
  return days === 1 ? "Video deletes in 1 day" : `Video deletes in ${days} days`;
}

/**
 * Moving a card older than 25 days out of a positive stage starts the clock again.
 * Returns the days left for the warning "This video deletes within {X} days.", or `null` when no warning is needed.
 */
export function warnOnMoveOutOfPositive(
  a: RetentionInput,
  toStageId: string,
  stages: StageDef[],
  now: Date,
): number | null {
  if (!a.media || a.media.deletedAt) return null;
  if (!isPositiveStage(a.stageId, stages) || isPositiveStage(toStageId, stages)) return null;
  const age = ageInDays(a.createdAt, now);
  if (age < WARN_FROM_DAY) return null;
  return Math.max(0, RETENTION_DAYS - age);
}
