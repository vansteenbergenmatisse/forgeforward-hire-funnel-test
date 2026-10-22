import type { StageDef } from "@/features/projects";

/** Days a video lives outside a kept stage. Same number the daily clean-up uses. */
const VIDEO_DAYS = 30;

const cards = (n: number) => `${n} ${n === 1 ? "card" : "cards"}`;

/**
 * Text for turning "Keep videos" off on a stage that holds cards, or null when nothing is at risk.
 * The daily clean-up deletes video, thumbnail and task file of cards outside a kept stage once they are 30 days old.
 */
export function stopKeepingWarning(stage: Pick<StageDef, "name" | "isPositive">, cardCount: number): string | null {
  if (!stage.isPositive || cardCount <= 0) return null;
  return `${cards(cardCount)} in ${stage.name} would no longer be protected. Videos older than ${VIDEO_DAYS} days are deleted at the next daily clean-up (03:00 UTC), and newer ones when they reach ${VIDEO_DAYS} days. A deleted video cannot be brought back.`;
}

/** Text for deleting a kept stage when its cards move to a stage that does not keep videos. Null when no video loses protection. */
export function moveOutOfKeptWarning(from: Pick<StageDef, "name" | "isPositive">, target: Pick<StageDef, "name" | "isPositive"> | undefined, cardCount: number): string | null {
  if (!from.isPositive || !target || target.isPositive || cardCount <= 0) return null;
  return `${target.name} does not keep videos. The videos of ${cards(cardCount)} from ${from.name} would be deleted once they are ${VIDEO_DAYS} days old, or at the next daily clean-up if they already are.`;
}
