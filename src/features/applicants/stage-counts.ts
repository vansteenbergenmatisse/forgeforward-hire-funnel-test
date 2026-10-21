import type { StageDef } from "@/features/projects";
import type { ApplicantView } from "./types";

/** Cards per stage on the board. Test applicants and "Did not finish" are not counted. */
export function stageCounts(applicants: ApplicantView[], stages: StageDef[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(stages.map((s) => [s.id, 0]));
  for (const a of applicants) {
    if (a.isTest || a.stageId === null) continue;
    if (a.stageId in counts) counts[a.stageId] += 1;
  }
  return counts;
}

export function boardCount(applicants: ApplicantView[]): number {
  return applicants.filter((a) => !a.isTest && a.stageId !== null).length;
}

export function didNotFinishCount(applicants: ApplicantView[]): number {
  return applicants.filter((a) => !a.isTest && a.stageId === null).length;
}
