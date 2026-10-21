import type { StageColor, StageDef, StageRole } from "@/features/projects";

export const STAGE_COLORS: StageColor[] = ["gray", "blue", "amber", "purple", "teal", "green", "red"];

export const ROLE_LABEL: Record<Exclude<StageRole, null>, string> = {
  entry_new: "New applicants land here",
  entry_task: "Did the task lands here",
  on_booking: "Cal.com booking moves here",
};

export const ROLES = Object.keys(ROLE_LABEL) as Exclude<StageRole, null>[];

/**
 * Gives `role` to the stage `stageId`. Each role sits on exactly one stage, so the previous holder loses it.
 * If the target stage already held another role, that role swaps to the previous holder so no role is orphaned.
 * Passing null is refused: a stage that holds a role keeps it until another stage takes it.
 */
export function assignRole(stages: readonly StageDef[], stageId: string, role: StageRole): StageDef[] {
  if (role === null) return [...stages];
  const target = stages.find((s) => s.id === stageId);
  if (!target || target.role === role) return [...stages];
  const previousHolder = stages.find((s) => s.role === role);
  return stages.map((s) => {
    if (s.id === stageId) return { ...s, role };
    if (previousHolder && s.id === previousHolder.id) return { ...s, role: target.role };
    return s;
  });
}

export type DeleteCheck =
  | { ok: true; cards: number }
  | { ok: false; reason: "role" | "last"; message: string };

/** A stage that holds a role cannot be deleted. The last stage cannot be deleted either. */
export function checkDeleteStage(stages: readonly StageDef[], stageId: string, cards: number): DeleteCheck {
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) return { ok: false, reason: "last", message: "That stage no longer exists." };
  if (stage.role) {
    return { ok: false, reason: "role", message: `${stage.name} holds the "${ROLE_LABEL[stage.role]}" role. Move the role to another stage first.` };
  }
  if (stages.length <= 1) return { ok: false, reason: "last", message: "A project needs at least one stage." };
  return { ok: true, cards };
}

/** Valid targets for cards from a deleted stage: any other stage. */
export function validDeleteTargets(stages: readonly StageDef[], stageId: string): StageDef[] {
  return stages.filter((s) => s.id !== stageId);
}

/** Removes the stage. When cards sit in it, a valid target stage is required. */
export function deleteStage(stages: readonly StageDef[], stageId: string, cards: number, targetId?: string): StageDef[] | null {
  const check = checkDeleteStage(stages, stageId, cards);
  if (!check.ok) return null;
  if (cards > 0 && !validDeleteTargets(stages, stageId).some((s) => s.id === targetId)) return null;
  return stages.filter((s) => s.id !== stageId);
}

export function uniqueStageName(stages: readonly StageDef[], base = "New stage"): string {
  const taken = new Set(stages.map((s) => s.name.trim().toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base} ${i}`.toLowerCase())) return `${base} ${i}`;
}

export function addStage(stages: readonly StageDef[], id: string): StageDef[] {
  return [...stages, { id, name: uniqueStageName(stages), color: "gray", isPositive: false, role: null }];
}

export function validateStageName(stages: readonly StageDef[], stageId: string, name: string): string | null {
  const v = name.trim();
  if (v === "") return "Give the stage a name.";
  if (v.length > 40) return "Use 40 characters or fewer.";
  const clash = stages.some((s) => s.id !== stageId && s.name.trim().toLowerCase() === v.toLowerCase());
  return clash ? "Another stage already has this name." : null;
}
