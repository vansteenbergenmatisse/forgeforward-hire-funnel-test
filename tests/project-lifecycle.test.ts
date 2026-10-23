import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { closeDb, db, tables } from "@/platform/db";
import { deleteObject, headObject, listObjects, putObject, withPrefix } from "@/platform/r2";
import { hashToken } from "@/shared/token-hash";

const haveDb = Boolean(process.env.TEST_DATABASE_URL);
const haveR2 = Boolean(process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID);
if (haveDb) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.R2_KEY_PREFIX = "test/";
process.env.ADMIN_KEY ||= "t".repeat(48);

const suffix = crypto.randomUUID().slice(0, 8);
const T = tables;
const created: string[] = [];
const r2Keys: string[] = [];

type Seeded = { id: string; slug: string; applicantIds: string[]; videoKeys: string[]; strayKey: string; stageId: string };

async function seed(label: string, applicantCount: number): Promise<Seeded> {
  const slug = `lc-${label}-${suffix}`;
  const [p] = await db().insert(T.projects).values({ slug, name: `LC ${label} ${suffix}`, videoPrompt: "p", thankYouText: "t" }).returning();
  created.push(p.id);
  const [stage] = await db().insert(T.stages).values([{ projectId: p.id, name: "New", position: 0, role: "entry_new" }, { projectId: p.id, name: "Other", position: 1 }]).returning();
  await db().insert(T.projectQuestions).values({ projectId: p.id, label: "Years?", type: "short_text", required: false });
  const [tpl] = await db().insert(T.messageTemplates).values({ projectId: p.id, channel: "email", name: "Hi", body: "Hi" }).returning();
  const applicantIds: string[] = [];
  const videoKeys: string[] = [];
  for (let i = 0; i < applicantCount; i++) {
    const id = crypto.randomUUID();
    const videoKey = withPrefix(`videos/${slug}/${id}/1.webm`);
    if (haveR2) {
      await putObject(videoKey, "x", "video/webm");
      r2Keys.push(videoKey);
    }
    await db().insert(T.applicants).values({
      id,
      projectId: p.id,
      stageId: stage.id,
      resumeTokenHash: hashToken(id),
      firstName: "Lc",
      lastName: `P${i}`,
      email: `lc-${label}-${i}-${suffix}@example.test`,
      phoneE164: "+14155552671",
      timezone: "UTC",
      consentAt: new Date(),
      consentText: "c",
      funnelStep: "completed",
      videoKey,
      notes: "private note",
    });
    await db().insert(T.applicantEvents).values({ applicantId: id, type: "form_submitted" });
    await db().insert(T.messages).values({ applicantId: id, channel: "email", direction: "out", body: "hi", status: "sent", templateId: tpl.id });
    await db().insert(T.systemErrors).values({ source: "t", message: "m", applicantId: id });
    applicantIds.push(id);
    videoKeys.push(videoKey);
  }
  // An upload that never reached an applicant row: only the slug folder sweep can find it.
  const strayKey = withPrefix(`videos/${slug}/${crypto.randomUUID()}/orphan.webm`);
  if (haveR2) {
    await putObject(strayKey, "x", "video/webm");
    r2Keys.push(strayKey);
  }
  return { id: p.id, slug, applicantIds, videoKeys, strayKey, stageId: stage.id };
}

const count = async (table: "applicants" | "stages" | "projectQuestions" | "messageTemplates", projectId: string) =>
  (await db().select().from(T[table]).where(eq(T[table].projectId, projectId))).length;

describe.skipIf(!haveDb)("project lifecycle against the test database", { timeout: 90_000 }, () => {
  let life: typeof import("@/features/project-lifecycle/server");
  let projects: typeof import("@/features/projects/server");
  let funnel: typeof import("@/features/applicant-funnel/server");

  beforeAll(async () => {
    life = await import("@/features/project-lifecycle/server");
    projects = await import("@/features/projects/server");
    funnel = await import("@/features/applicant-funnel/server");
  });

  afterAll(async () => {
    for (const k of r2Keys) await deleteObject(k).catch(() => {});
    if (created.length) await db().delete(T.projects).where(inArray(T.projects.id, created));
    await db().delete(T.adminAudit).where(and(eq(T.adminAudit.targetType, "project"), inArray(T.adminAudit.targetId, created.map((_, i) => `lc-x-${i}`))));
    await closeDb();
  });

  it("previews counts without changing anything", async () => {
    const a = await seed("prev", 2);
    const p = await life.previewProjectDeletion(a.slug);
    expect(p.counts).toMatchObject({ applicants: 2, files: 2, stages: 2, questions: 1, templates: 1, messages: 2 });
    expect(p.deleting).toBe(false);
    expect(await count("applicants", a.id)).toBe(2);
    await expect(life.previewProjectDeletion(`nope-${suffix}`)).rejects.toMatchObject({ status: 404 });
  });

  it("deactivate blocks /apply/start, reactivate restores it, and the status call is idempotent", async () => {
    const a = await seed("act", 0);
    const questions = await db().select().from(T.projectQuestions).where(eq(T.projectQuestions.projectId, a.id));
    const body = (email: string) => ({
      projectSlug: a.slug,
      firstName: "Sam",
      lastName: "Rivera",
      email,
      phone: "(415) 555-2671",
      phoneCountry: "US",
      whatsappOk: true,
      timezone: "America/New_York",
      consent: true,
      answers: { [questions[0].id]: "x" },
      utm: {},
      inAppBrowser: false,
    });
    const start = (n: number, email: string) =>
      funnel.startApplication(new Request("http://x/api/apply/start", { method: "POST", headers: { "x-forwarded-for": `198.51.100.${n}-${suffix}` } }), body(email), `key-${crypto.randomUUID()}`);

    expect(await projects.setProjectStatus(a.slug, "closed")).toMatchObject({ changed: true, from: "open" });
    expect(await projects.setProjectStatus(a.slug, "closed")).toMatchObject({ changed: false });
    await expect(start(1, `lc-a-${suffix}@example.com`)).rejects.toMatchObject({ status: 403, code: "closed" });
    expect((await funnel.getFunnelProject(a.slug))?.status).toBe("closed");

    expect(await projects.setProjectStatus(a.slug, "open")).toMatchObject({ changed: true, from: "closed" });
    const ok = (await start(2, `lc-b-${suffix}@example.com`)) as { applicant_id: string };
    expect(ok.applicant_id).toBeTruthy();
    // Data of an inactive project stays: deactivate again, the applicant is still there.
    await projects.setProjectStatus(a.slug, "closed");
    expect(await count("applicants", a.id)).toBe(1);
  });

  describe.skipIf(!haveR2)("delete", () => {
    it("removes the project, its rows and its R2 objects, and leaves another project intact", async () => {
      const gone = await seed("gone", 3);
      const keep = await seed("keep", 2);
      await db().insert(T.unmatchedBookings).values({ payload: {}, attendeeEmail: `lc-gone-0-${suffix}@example.test` });

      const out = await life.deleteProject(gone.slug);
      expect(out).toMatchObject({ done: true, found: true, failed: 0 });
      expect(out.removed.applicants).toBe(3);

      expect(await db().select().from(T.projects).where(eq(T.projects.id, gone.id))).toHaveLength(0);
      for (const t of ["applicants", "stages", "projectQuestions", "messageTemplates"] as const) expect(await count(t, gone.id)).toBe(0);
      expect(await db().select().from(T.applicantEvents).where(inArray(T.applicantEvents.applicantId, gone.applicantIds))).toHaveLength(0);
      expect(await db().select().from(T.messages).where(inArray(T.messages.applicantId, gone.applicantIds))).toHaveLength(0);
      expect(await db().select().from(T.systemErrors).where(inArray(T.systemErrors.applicantId, gone.applicantIds))).toHaveLength(0);
      expect(await db().select().from(T.unmatchedBookings).where(eq(T.unmatchedBookings.attendeeEmail, `lc-gone-0-${suffix}@example.test`))).toHaveLength(0);
      for (const k of [...gone.videoKeys, gone.strayKey]) expect(await headObject(k)).toBeNull();
      expect((await listObjects(withPrefix(`videos/${gone.slug}/`))).objects).toHaveLength(0);

      // The other project: every row and object is still there.
      expect(await count("applicants", keep.id)).toBe(2);
      expect(await count("stages", keep.id)).toBe(2);
      expect(await count("projectQuestions", keep.id)).toBe(1);
      expect(await count("messageTemplates", keep.id)).toBe(1);
      expect(await db().select().from(T.messages).where(inArray(T.messages.applicantId, keep.applicantIds))).toHaveLength(2);
      for (const k of [...keep.videoKeys, keep.strayKey]) expect(await headObject(k)).not.toBeNull();

      // Audit: counts only, no names or emails.
      const audit = await db().select().from(T.adminAudit).where(and(eq(T.adminAudit.targetType, "project"), eq(T.adminAudit.targetId, gone.slug)));
      expect(audit.map((r) => r.action).sort()).toEqual(["project.delete", "project.delete_requested"]);
      expect(JSON.stringify(audit.map((r) => r.detail))).not.toMatch(/@|Lc|private note/);
      await db().delete(T.adminAudit).where(eq(T.adminAudit.targetId, gone.slug));

      // Idempotent: a second call is a no-op.
      expect(await life.deleteProject(gone.slug)).toMatchObject({ done: true, found: false });
    });

    it("hides a half-deleted project at once and finishes it on the next call", async () => {
      const half = await seed("half", 3);
      // No time at all: the project is marked deleting and nothing else happens.
      const first = await life.deleteProject(half.slug, { budgetMs: 0 });
      expect(first).toMatchObject({ done: false, found: true });
      expect(first.remaining?.applicants).toBe(3);
      const [row] = await db().select().from(T.projects).where(eq(T.projects.id, half.id));
      expect(row.status).toBe("deleting");

      // Hidden from lists, the admin lookup and the public link; the slug stays taken.
      expect((await projects.listProjects()).some((p) => p.def.slug === half.slug)).toBe(false);
      await expect(projects.getProject(half.slug)).rejects.toMatchObject({ status: 404 });
      expect(await funnel.getFunnelProject(half.slug)).toBeNull();
      await expect(projects.setProjectStatus(half.slug, "open")).rejects.toMatchObject({ status: 404 });
      expect(await life.hasPendingDeletions()).toBe(true);

      // The next call (the cron runs this) finishes it.
      const done = await life.finishPendingDeletions();
      expect(done.done).toBeGreaterThanOrEqual(1);
      expect(await db().select().from(T.projects).where(eq(T.projects.id, half.id))).toHaveLength(0);
      expect(await count("applicants", half.id)).toBe(0);
      for (const k of [...half.videoKeys, half.strayKey]) expect(await headObject(k)).toBeNull();
      await db().delete(T.adminAudit).where(eq(T.adminAudit.targetId, half.slug));
    });

    it("resumes across calls when only a few applicants fit in the time budget", async () => {
      const big = await seed("big", 30);
      let calls = 0;
      let res = await life.deleteProject(big.slug, { budgetMs: 1 });
      while (!res.done && calls++ < 40) res = await life.deleteProject(big.slug, { budgetMs: 1 });
      expect(res.done).toBe(true);
      expect(await count("applicants", big.id)).toBe(0);
      await db().delete(T.adminAudit).where(eq(T.adminAudit.targetId, big.slug));
    });
  });
});
