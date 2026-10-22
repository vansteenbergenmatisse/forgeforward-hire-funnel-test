import { and, asc, eq, sql } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import type { QuestionDef } from "../types";
import { projectBySlug } from "./bundles";
import { conflict, notFound, unprocessable } from "./errors";
import { toQuestion } from "./mappers";
import { lastPosition } from "./projects";
import type { z } from "zod";
import type { createQuestionBody, updateQuestionBody } from "./schemas";

const T = tables;
type QuestionRow = typeof T.projectQuestions.$inferSelect;

const CHOICE = new Set(["single_choice", "multi_choice"]);

/** Trims, drops blanks and removes case-insensitive duplicates, keeping the first spelling. */
export function normalizeOptions(options: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of options) {
    const v = raw.trim().replace(/\s+/g, " ");
    const key = v.toLowerCase();
    if (v === "" || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function finalOptions(type: string, options: readonly string[]): string[] {
  if (!CHOICE.has(type)) return [];
  const list = normalizeOptions(options);
  if (list.length < 2) throw unprocessable("invalid_options", "Add at least two different choices.");
  return list;
}

async function questionById(id: string): Promise<QuestionRow> {
  const [row] = await db().select().from(T.projectQuestions).where(eq(T.projectQuestions.id, id)).limit(1);
  if (!row) throw notFound("Question");
  return row;
}

export async function createQuestion(input: z.infer<typeof createQuestionBody>): Promise<QuestionDef> {
  const options = finalOptions(input.type, input.options);
  return db().transaction(async (tx) => {
    const project = await projectBySlug(tx, input.projectSlug);
    const [row] = await tx
      .insert(T.projectQuestions)
      .values({
        ...(input.id ? { id: input.id } : {}),
        projectId: project.id,
        label: input.label.trim(),
        helpText: input.helpText.trim(),
        type: input.type,
        options,
        required: input.required,
        position: await lastPosition(tx, "projectQuestions", project.id),
      })
      .returning();
    return toQuestion(row);
  });
}

/** Archiving only flips a flag. Applicants keep the label they answered, because answers store their own label. */
export async function updateQuestion(id: string, patch: z.infer<typeof updateQuestionBody>): Promise<QuestionDef> {
  const cur = await questionById(id);
  const type = patch.type ?? cur.type;
  const set: Partial<typeof T.projectQuestions.$inferInsert> = {};
  if (patch.label !== undefined) set.label = patch.label.trim();
  if (patch.helpText !== undefined) set.helpText = patch.helpText.trim();
  if (patch.required !== undefined) set.required = patch.required;
  if (patch.archived !== undefined) set.archived = patch.archived;
  if (patch.type !== undefined || patch.options !== undefined) {
    set.type = type;
    set.options = finalOptions(type, patch.options ?? cur.options);
  }
  if (Object.keys(set).length === 0) return toQuestion(cur);
  const [row] = await db().update(T.projectQuestions).set(set).where(eq(T.projectQuestions.id, id)).returning();
  return toQuestion(row);
}

/** Hard delete only while nobody answered it. Otherwise archive. */
export async function deleteQuestion(id: string): Promise<{ deleted: string }> {
  const cur = await questionById(id);
  const [{ n }] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(T.applicants)
    .where(and(eq(T.applicants.projectId, cur.projectId), sql`${T.applicants.answers} -> ${id} is not null`));
  if (n > 0) throw conflict("question_has_answers", "Applicants answered this question. Archive it instead so their answers keep the label.");
  await db().delete(T.projectQuestions).where(eq(T.projectQuestions.id, id));
  return { deleted: id };
}

export async function reorderQuestions(slug: string, ids: string[]): Promise<QuestionDef[]> {
  return db().transaction(async (tx) => {
    const project = await projectBySlug(tx, slug);
    const rows = await tx.select().from(T.projectQuestions).where(eq(T.projectQuestions.projectId, project.id)).orderBy(asc(T.projectQuestions.position));
    if (ids.length !== rows.length || !rows.every((r) => ids.includes(r.id)) || new Set(ids).size !== ids.length) {
      throw unprocessable("ids_mismatch", "The list must contain every question of the project once.");
    }
    for (const [position, id] of ids.entries()) await tx.update(T.projectQuestions).set({ position }).where(eq(T.projectQuestions.id, id));
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => toQuestion(byId.get(id) as QuestionRow));
  });
}
