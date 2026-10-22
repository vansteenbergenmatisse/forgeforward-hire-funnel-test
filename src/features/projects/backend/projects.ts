import { eq, max } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { BLANK_PROJECT_DEF, DEFAULT_STAGES, DEFAULT_TEMPLATE } from "../defaults";
import { uniqueSlug } from "../slug";
import { getProject, projectBySlug, type Tx } from "./bundles";
import { ApiError, conflict, isUniqueViolation } from "./errors";
import type { ProjectRecordDto } from "../types";

const T = tables;
const CHILD_KEYS = ["id", "projectId", "createdAt", "updatedAt"] as const;

function without<R extends object, K extends keyof R>(row: R, keys: readonly K[]): Omit<R, K> {
  return Object.fromEntries(Object.entries(row).filter(([k]) => !(keys as readonly string[]).includes(k))) as Omit<R, K>;
}

async function insertDefaults(tx: Tx, projectId: string) {
  await tx.insert(T.stages).values(DEFAULT_STAGES.map((s, position) => ({ ...s, position, projectId })));
  await tx.insert(T.messageTemplates).values(
    (["email", "sms", "whatsapp"] as const).map((channel, position) => ({
      projectId,
      channel,
      name: DEFAULT_TEMPLATE.name,
      subject: channel === "email" ? DEFAULT_TEMPLATE.subject : "",
      body: DEFAULT_TEMPLATE.body,
      waTemplateName: channel === "whatsapp" ? "interview_invite" : null,
      waLanguage: channel === "whatsapp" ? "en" : null,
      waVariables: channel === "whatsapp" ? ["first_name", "cal_link"] : [],
      position,
    })),
  );
}

async function createOnce(input: { name: string; mode: "blank" | "duplicate"; sourceSlug?: string }): Promise<string> {
  const d = db();
  return d.transaction(async (tx) => {
    const taken = (await tx.select({ slug: T.projects.slug }).from(T.projects)).map((r) => r.slug);
    const slug = uniqueSlug(input.name, taken);
    const name = input.name.trim();

    if (input.mode === "blank") {
      const b = BLANK_PROJECT_DEF;
      const [p] = await tx
        .insert(T.projects)
        .values({
          slug,
          name,
          status: "open",
          intro: b.intro,
          calLink: b.calLink,
          videoPrompt: b.videoPrompt,
          prepSeconds: b.prepSeconds,
          maxRecordSeconds: b.maxRecordSeconds,
          retakesAllowed: b.retakesAllowed,
          taskEnabled: b.taskEnabled,
          taskTitle: b.taskTitle,
          taskContent: { html: "" },
          taskAllowText: b.taskAllowText,
          taskAllowLink: b.taskAllowLink,
          taskAllowFile: b.taskAllowFile,
          thankYouText: b.thankYouText,
          replyDays: b.replyDays,
          handoffEnabled: b.handoffEnabled,
        })
        .returning({ id: T.projects.id });
      await insertDefaults(tx, p.id);
      return slug;
    }

    if (!input.sourceSlug) throw new ApiError(422, "source_required", "Pick a project to copy.");
    const src = await projectBySlug(tx, input.sourceSlug);
    const srcId = src.id;
    const copy = without(src, ["id", "slug", "name", "createdAt", "updatedAt"]);
    const [p] = await tx.insert(T.projects).values({ ...copy, slug, name, status: "open" }).returning({ id: T.projects.id });

    const stages = await tx.select().from(T.stages).where(eq(T.stages.projectId, srcId));
    if (stages.length)
      await tx.insert(T.stages).values(stages.map((s) => ({ ...without(s, CHILD_KEYS), projectId: p.id })));
    const questions = await tx.select().from(T.projectQuestions).where(eq(T.projectQuestions.projectId, srcId));
    const kept = questions.filter((q) => !q.archived);
    if (kept.length)
      await tx.insert(T.projectQuestions).values(kept.map((q, position) => ({ ...without(q, CHILD_KEYS), position, projectId: p.id })));
    const templates = await tx.select().from(T.messageTemplates).where(eq(T.messageTemplates.projectId, srcId));
    if (templates.length)
      await tx.insert(T.messageTemplates).values(templates.map((t) => ({ ...without(t, CHILD_KEYS), projectId: p.id })));
    return slug;
  });
}

/** Creates a blank project (default stages and templates, no questions) or a copy of another project. */
export async function createProject(input: { name: string; mode: "blank" | "duplicate"; sourceSlug?: string }): Promise<ProjectRecordDto> {
  let slug: string | undefined;
  for (let attempt = 0; attempt < 3 && !slug; attempt++) {
    try {
      slug = await createOnce(input);
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  if (!slug) throw conflict("slug_taken", "Could not find a free link slug. Try again.");
  return getProject(slug);
}

export async function lastPosition(tx: Tx, table: "stages" | "projectQuestions" | "messageTemplates", projectId: string): Promise<number> {
  const t = T[table];
  const [r] = await tx.select({ m: max(t.position) }).from(t).where(eq(t.projectId, projectId));
  return (r?.m ?? -1) + 1;
}
