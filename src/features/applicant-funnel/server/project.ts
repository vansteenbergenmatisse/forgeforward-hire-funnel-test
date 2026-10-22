import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import type { FunnelProject } from "../types";
import { taskContentToHtml } from "./rich-text";

type ProjectRow = typeof tables.projects.$inferSelect;
type QuestionRow = typeof tables.projectQuestions.$inferSelect;

export function toFunnelProject(p: ProjectRow, qs: QuestionRow[]): FunnelProject {
  return {
    slug: p.slug,
    name: p.name,
    status: p.status,
    intro: p.intro,
    calLink: p.calLink,
    videoPrompt: p.videoPrompt,
    prepSeconds: p.prepSeconds,
    maxRecordSeconds: p.maxRecordSeconds,
    retakesAllowed: p.retakesAllowed,
    taskEnabled: p.taskEnabled,
    taskTitle: p.taskTitle,
    taskBody: taskContentToHtml(p.taskContent),
    taskAllowText: p.taskAllowText,
    taskAllowLink: p.taskAllowLink,
    taskAllowFile: p.taskAllowFile,
    thankYouText: p.thankYouText,
    replyDays: p.replyDays,
    handoffEnabled: p.handoffEnabled,
    questions: qs.map((q) => ({
      id: q.id,
      label: q.label,
      helpText: q.helpText,
      type: q.type,
      options: q.options,
      required: q.required,
      archived: q.archived,
    })),
  };
}

export async function loadProjectRow(slug: string) {
  const [row] = await db().select().from(tables.projects).where(eq(tables.projects.slug, slug));
  return row ?? null;
}

/** Public funnel project by slug, or null when unknown. Closed projects are returned with status "closed". */
export async function getFunnelProject(slug: string): Promise<FunnelProject | null> {
  const p = await loadProjectRow(slug);
  if (!p) return null;
  const qs = await db()
    .select()
    .from(tables.projectQuestions)
    .where(eq(tables.projectQuestions.projectId, p.id))
    .orderBy(asc(tables.projectQuestions.position));
  return toFunnelProject(p, qs);
}
