import type { StageDef } from "@/features/projects";

/** The "Good profile + english, invite interview" stage. Stages are project data, so match by name, never by id. */
export function findGoodStage(stages: StageDef[]): StageDef | undefined {
  return stages.find((s) => /good profile/i.test(s.name));
}

/** The Rejected stage: by name first, then the red stage that is not kept. */
export function findRejectedStage(stages: StageDef[]): StageDef | undefined {
  return stages.find((s) => /^rejected$/i.test(s.name.trim())) ?? stages.find((s) => s.color === "red" && !s.isPositive);
}

/** The item after the current one, else the one before it, else null. Read this before the move, while the current item is still in the list. */
export function nextAfter<T extends { id: string }>(list: T[], currentId: string): T | null {
  const i = list.findIndex((x) => x.id === currentId);
  if (i === -1) return null;
  return list[i + 1] ?? list[i - 1] ?? null;
}
