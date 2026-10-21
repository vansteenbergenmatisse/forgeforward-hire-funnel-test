import type { StageDef } from "@/features/projects";
import type { ApplicantView } from "@/features/applicants";

/** Cards per stage, in stage order. Keeps the order of `applicants`. Cards with an unknown stage are dropped. */
export function groupByStage(applicants: ApplicantView[], stages: StageDef[]): { stage: StageDef; cards: ApplicantView[] }[] {
  const byId = new Map<string, ApplicantView[]>(stages.map((s) => [s.id, []]));
  for (const a of applicants) {
    if (a.stageId !== null) byId.get(a.stageId)?.push(a);
  }
  return stages.map((stage) => ({ stage, cards: byId.get(stage.id) ?? [] }));
}
