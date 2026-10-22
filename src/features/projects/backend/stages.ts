import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import type { StageDef } from "../types";
import { projectBySlug } from "./bundles";
import { conflict, notFound, unprocessable } from "./errors";
import { toStage } from "./mappers";
import { lastPosition } from "./projects";
import type { z } from "zod";
import type { createStageBody, updateStageBody } from "./schemas";

const T = tables;
type StageRow = typeof T.stages.$inferSelect;

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

async function stageById(id: string): Promise<StageRow> {
  const [row] = await db().select().from(T.stages).where(eq(T.stages.id, id)).limit(1);
  if (!row) throw notFound("Stage");
  return row;
}

async function projectStages(projectId: string): Promise<StageRow[]> {
  return db().select().from(T.stages).where(eq(T.stages.projectId, projectId)).orderBy(asc(T.stages.position), asc(T.stages.createdAt));
}

export async function createStage(input: z.infer<typeof createStageBody>): Promise<StageDef> {
  return db().transaction(async (tx) => {
    const project = await projectBySlug(tx, input.projectSlug);
    const existing = await tx.select().from(T.stages).where(eq(T.stages.projectId, project.id));
    if (existing.some((s) => sameName(s.name, input.name))) throw conflict("stage_name_taken", "Another stage already has this name.");
    const [row] = await tx
      .insert(T.stages)
      .values({
        ...(input.id ? { id: input.id } : {}),
        projectId: project.id,
        name: input.name,
        color: input.color,
        isPositive: input.isPositive,
        position: await lastPosition(tx, "stages", project.id),
      })
      .returning();
    return toStage(row);
  });
}

/**
 * Edits one stage. Giving a stage a role moves that role off its old holder, and the old holder takes this
 * stage's previous role, so each role always sits on exactly one stage. Returns every stage of the project.
 */
export async function updateStage(id: string, patch: z.infer<typeof updateStageBody>): Promise<StageDef[]> {
  const cur = await stageById(id);
  await db().transaction(async (tx) => {
    if (patch.name !== undefined) {
      const others = await tx.select().from(T.stages).where(and(eq(T.stages.projectId, cur.projectId), ne(T.stages.id, id)));
      if (others.some((s) => sameName(s.name, patch.name as string))) throw conflict("stage_name_taken", "Another stage already has this name.");
    }
    if (patch.role === null && cur.role !== null) {
      throw conflict("role_required", `${cur.name} holds a role. Move the role to another stage first.`);
    }
    if (patch.role && patch.role !== cur.role) {
      const [holder] = await tx
        .select()
        .from(T.stages)
        .where(and(eq(T.stages.projectId, cur.projectId), eq(T.stages.role, patch.role), ne(T.stages.id, id)));
      if (holder) await tx.update(T.stages).set({ role: null }).where(eq(T.stages.id, holder.id));
      await tx.update(T.stages).set({ role: patch.role }).where(eq(T.stages.id, id));
      if (holder && cur.role) await tx.update(T.stages).set({ role: cur.role }).where(eq(T.stages.id, holder.id));
    }
    const plain: Partial<typeof T.stages.$inferInsert> = {};
    if (patch.name !== undefined) plain.name = patch.name;
    if (patch.color !== undefined) plain.color = patch.color;
    if (patch.isPositive !== undefined) plain.isPositive = patch.isPositive;
    if (Object.keys(plain).length) await tx.update(T.stages).set(plain).where(eq(T.stages.id, id));
  });
  return (await projectStages(cur.projectId)).map(toStage);
}

/** Deletes a stage. A stage with a role, or the last stage, cannot go. Cards in it move to `moveTo` and get a stage_changed event. */
export async function deleteStage(id: string, moveTo?: string): Promise<{ deleted: string; moved: number }> {
  const cur = await stageById(id);
  return db().transaction(async (tx) => {
    const all = await tx.select().from(T.stages).where(eq(T.stages.projectId, cur.projectId));
    if (cur.role) throw conflict("stage_has_role", `${cur.name} holds a role. Move the role to another stage first.`);
    if (all.length <= 1) throw conflict("last_stage", "A project needs at least one stage.");
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(T.applicants).where(eq(T.applicants.stageId, id));
    let moved = 0;
    if (n > 0) {
      const target = all.find((s) => s.id === moveTo && s.id !== id);
      if (!target) throw unprocessable("move_to_required", "Pick the stage to move the cards to.");
      await tx.execute(sql`
        insert into applicant_events (applicant_id, type, data)
        select id, 'stage_changed', jsonb_build_object('from', ${id}::text, 'to', ${target.id}::text, 'fromName', ${cur.name}::text, 'toName', ${target.name}::text, 'reason', 'stage_deleted'::text)
        from applicants where stage_id = ${id}`);
      await tx.update(T.applicants).set({ stageId: target.id, lastStageChangeAt: new Date() }).where(eq(T.applicants.stageId, id));
      moved = n;
    }
    await tx.delete(T.stages).where(eq(T.stages.id, id));
    return { deleted: id, moved };
  });
}

export async function reorderStages(slug: string, ids: string[]): Promise<StageDef[]> {
  return db().transaction(async (tx) => {
    const project = await projectBySlug(tx, slug);
    const rows = await tx.select().from(T.stages).where(eq(T.stages.projectId, project.id));
    if (ids.length !== rows.length || !rows.every((r) => ids.includes(r.id)) || new Set(ids).size !== ids.length) {
      throw unprocessable("ids_mismatch", "The list must contain every stage of the project once.");
    }
    for (const [position, id] of ids.entries()) await tx.update(T.stages).set({ position }).where(eq(T.stages.id, id));
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => toStage({ ...(byId.get(id) as StageRow) }));
  });
}
