import type { StageDef } from "@/features/projects";
import { RETENTION_DAYS } from "@/features/retention";

const cards = (n: number) => `${n} ${n === 1 ? "card" : "cards"}`;

/**
 * Text for turning "Keep applicants" off on a stage that holds cards, or null when nothing is at risk.
 * The daily clean-up deletes an applicant completely 30 days after the last stage change, in every stage that is not kept.
 */
export function stopKeepingWarning(stage: Pick<StageDef, "name" | "isPositive">, cardCount: number): string | null {
  if (!stage.isPositive || cardCount <= 0) return null;
  return `${cards(cardCount)} in ${stage.name} would no longer be protected. Applicants last moved more than ${RETENTION_DAYS} days ago are deleted at the next daily clean-up (03:00 UTC), and the others when they reach ${RETENTION_DAYS} days. This removes their details, answers, messages, notes and files. It cannot be undone.`;
}

/** Text for deleting a kept stage when its cards move to a stage that is not kept. Null when no applicant loses protection. */
export function moveOutOfKeptWarning(from: Pick<StageDef, "name" | "isPositive">, target: Pick<StageDef, "name" | "isPositive"> | undefined, cardCount: number): string | null {
  if (!from.isPositive || !target || target.isPositive || cardCount <= 0) return null;
  return `${target.name} is not a kept stage. The ${cards(cardCount)} from ${from.name} would be deleted completely ${RETENTION_DAYS} days after the move.`;
}
