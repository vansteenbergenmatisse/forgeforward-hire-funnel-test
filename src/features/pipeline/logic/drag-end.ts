import type { StageDef } from "@/features/projects";
import type { ApplicantView } from "@/features/applicants";

export const CARD_PREFIX = "card:";
export const STAGE_PREFIX = "stage:";

export const cardDragId = (applicantId: string) => `${CARD_PREFIX}${applicantId}`;
export const stageDropId = (stageId: string) => `${STAGE_PREFIX}${stageId}`;

export type DropResult = { applicantId: string; toStageId: string };

function stageIdFrom(overId: string, applicants: ApplicantView[], stages: StageDef[]): string | null {
  if (overId.startsWith(STAGE_PREFIX)) {
    const id = overId.slice(STAGE_PREFIX.length);
    return stages.some((s) => s.id === id) ? id : null;
  }
  if (overId.startsWith(CARD_PREFIX)) {
    const target = applicants.find((a) => a.id === overId.slice(CARD_PREFIX.length));
    return target?.stageId && stages.some((s) => s.id === target.stageId) ? target.stageId : null;
  }
  return null;
}

/** Turns a drag end into a move. `null` when dropped outside a column, on the same column, or for an unknown card. */
export function resolveDrop(activeId: string, overId: string | null, applicants: ApplicantView[], stages: StageDef[]): DropResult | null {
  if (overId === null || !activeId.startsWith(CARD_PREFIX)) return null;
  const applicantId = activeId.slice(CARD_PREFIX.length);
  const applicant = applicants.find((a) => a.id === applicantId);
  if (!applicant) return null;
  const toStageId = stageIdFrom(overId, applicants, stages);
  if (toStageId === null || toStageId === applicant.stageId) return null;
  return { applicantId, toStageId };
}
