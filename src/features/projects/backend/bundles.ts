import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { notFound } from "./errors";
import { toDef, toQuestion, toStage, toTemplate } from "./mappers";
import type { ProjectBundle, ProjectRecordDto } from "../types";

type Db = ReturnType<typeof db>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

const T = tables;

export async function projectBySlug(d: DbOrTx, slug: string) {
  const [row] = await d.select().from(T.projects).where(eq(T.projects.slug, slug)).limit(1);
  if (!row) throw notFound("Project");
  return row;
}

/** Reads full bundles (and stage card counts) for the given project rows. */
async function assemble(d: DbOrTx, rows: (typeof T.projects.$inferSelect)[]): Promise<ProjectRecordDto[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [stages, questions, templates, counts] = await Promise.all([
    d.select().from(T.stages).where(inArray(T.stages.projectId, ids)).orderBy(asc(T.stages.position), asc(T.stages.createdAt)),
    d.select().from(T.projectQuestions).where(inArray(T.projectQuestions.projectId, ids)).orderBy(asc(T.projectQuestions.position), asc(T.projectQuestions.createdAt)),
    d.select().from(T.messageTemplates).where(inArray(T.messageTemplates.projectId, ids)).orderBy(asc(T.messageTemplates.position), asc(T.messageTemplates.createdAt)),
    d
      .select({ stageId: T.applicants.stageId, n: sql<number>`count(*)::int` })
      .from(T.applicants)
      .where(and(inArray(T.applicants.projectId, ids), sql`${T.applicants.stageId} is not null`))
      .groupBy(T.applicants.stageId),
  ]);
  const countByStage = new Map(counts.map((c) => [c.stageId as string, c.n]));
  return rows.map((p) => {
    const st = stages.filter((s) => s.projectId === p.id);
    const bundle: ProjectBundle = {
      def: toDef(p),
      stages: st.map(toStage),
      questions: questions.filter((q) => q.projectId === p.id).map(toQuestion),
      templates: templates.filter((t) => t.projectId === p.id).map(toTemplate),
    };
    return { ...bundle, stageCounts: Object.fromEntries(st.map((s) => [s.id, countByStage.get(s.id) ?? 0])) };
  });
}

export async function listProjects(): Promise<ProjectRecordDto[]> {
  const d = db();
  return assemble(d, await d.select().from(T.projects).orderBy(asc(T.projects.createdAt)));
}

export async function getProject(slug: string, d: DbOrTx = db()): Promise<ProjectRecordDto> {
  return (await assemble(d, [await projectBySlug(d, slug)]))[0];
}

/** For the public funnel: the project plus its questions, or null when the slug is unknown. */
export async function loadProjectBySlug(slug: string): Promise<ProjectBundle | null> {
  const d = db();
  const [row] = await d.select().from(T.projects).where(eq(T.projects.slug, slug)).limit(1);
  if (!row) return null;
  const { stageCounts, ...bundle } = (await assemble(d, [row]))[0];
  void stageCounts;
  return bundle;
}
