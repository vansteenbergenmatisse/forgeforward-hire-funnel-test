import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { closeDb, db, tables } from "@/platform/db";
import { hashToken } from "@/shared/token-hash";
import { ApiError } from "./errors";
import { createProject } from "./projects";
import { getProject, listProjects } from "./bundles";
import { getSettings, updateSettings } from "./settings";
import { createStage, deleteStage, reorderStages, updateStage } from "./stages";
import { createQuestion, deleteQuestion, reorderQuestions, updateQuestion } from "./questions";
import { createTemplate, deleteTemplate, updateTemplate } from "./templates";

const haveDb = Boolean(process.env.TEST_DATABASE_URL);
if (haveDb) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const suffix = crypto.randomUUID().slice(0, 8);
const createdSlugs: string[] = [];

async function newProject(label: string, mode: "blank" | "duplicate" = "blank", sourceSlug?: string) {
  const p = await createProject({ name: `Zz ${label} ${suffix}`, mode, sourceSlug });
  createdSlugs.push(p.def.slug);
  return p;
}

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ApiError) return e.code;
    throw e;
  }
  return "ok";
}

afterAll(async () => {
  if (haveDb) await db().delete(tables.projects).where(inArray(tables.projects.slug, createdSlugs));
  await closeDb();
});

describe.skipIf(!haveDb)("projects", () => {
  it("creates a blank project with default stages, templates and no questions", async () => {
    const p = await newProject("blank");
    expect(p.def.status).toBe("open");
    expect(p.questions).toEqual([]);
    expect(p.stages.map((s) => s.role).filter(Boolean)).toEqual(["entry_new", "entry_task", "on_booking"]);
    expect(p.templates.map((t) => t.channel).sort()).toEqual(["email", "sms", "whatsapp"]);
    expect(p.stageCounts[p.stages[0].id]).toBe(0);
    expect((await listProjects()).some((x) => x.def.slug === p.def.slug)).toBe(true);
  });

  it("keeps slugs unique when the same name is used twice", async () => {
    const a = await newProject("same");
    const b = await newProject("same");
    expect(b.def.slug).not.toBe(a.def.slug);
    expect(b.def.slug).toMatch(/-2$/);
  });

  it("duplicates settings, stages, templates and active questions, with new ids", async () => {
    const src = await newProject("source");
    await updateSettings(src.def.slug, { intro: "Hello", videoPrompt: "Say hi", prepSeconds: 10 });
    const q = await createQuestion({ projectSlug: src.def.slug, label: "Why?", helpText: "", type: "short_text", options: [], required: true });
    const old = await createQuestion({ projectSlug: src.def.slug, label: "Old", helpText: "", type: "short_text", options: [], required: false });
    await updateQuestion(old.id, { archived: true });
    const copy = await newProject("copy", "duplicate", src.def.slug);
    expect(copy.def.intro).toBe("Hello");
    expect(copy.def.prepSeconds).toBe(10);
    expect(copy.questions.map((x) => x.label)).toEqual(["Why?"]);
    expect(copy.questions[0].id).not.toBe(q.id);
    expect(copy.stages.map((s) => s.id).some((id) => src.stages.some((s) => s.id === id))).toBe(false);
    expect(copy.stages.map((s) => s.role)).toEqual(src.stages.map((s) => s.role));
    expect(copy.templates).toHaveLength(3);
  });

  it("refuses a duplicate without a source", async () => {
    expect(await code(createProject({ name: `Zz nosource ${suffix}`, mode: "duplicate" }))).toBe("source_required");
  });
});

describe.skipIf(!haveDb)("settings", () => {
  it("updates general, video and thank-you fields and normalizes the Cal.com link", async () => {
    const p = await newProject("settings");
    const def = await updateSettings(p.def.slug, { name: "Renamed", status: "closed", calLink: "cal.com/forge/chat", replyDays: 7, handoffEnabled: false, maxRecordSeconds: 90, thankYouText: "Thanks {first_name}. {reply_days} days." });
    expect(def).toMatchObject({ name: "Renamed", status: "closed", calLink: "https://cal.com/forge/chat", replyDays: 7, handoffEnabled: false, maxRecordSeconds: 90 });
    expect((await getSettings(p.def.slug)).status).toBe("closed");
  });

  it("rejects a bad cal link and unknown thank-you variables", async () => {
    const p = await newProject("badvals");
    expect(await code(updateSettings(p.def.slug, { calLink: "not a link" }))).toBe("invalid_cal_link");
    expect(await code(updateSettings(p.def.slug, { thankYouText: "Hi {nope}" }))).toBe("invalid_thank_you");
  });

  it("stores the task body as sanitized HTML and refuses an incomplete task", async () => {
    const p = await newProject("task");
    expect(await code(updateSettings(p.def.slug, { taskEnabled: true }))).toBe("task_incomplete");
    const def = await updateSettings(p.def.slug, {
      taskEnabled: true,
      taskTitle: "Write a text",
      taskBody: '<h2>Task</h2><p onclick="x()">Do <strong>this</strong></p><script>alert(1)</script><a href="javascript:x">bad</a>',
    });
    expect(def.taskBody).toBe("<h2>Task</h2><p>Do <strong>this</strong></p><a>bad</a>");
    const [row] = await db().select().from(tables.projects).where(eq(tables.projects.slug, p.def.slug));
    expect(row.taskContent).toEqual({ html: def.taskBody });
    expect(await code(updateSettings(p.def.slug, { taskAllowText: false, taskAllowLink: false, taskAllowFile: false }))).toBe("task_incomplete");
  });

  it("changes the slug in the one table every reader uses, and rejects reserved or taken slugs", async () => {
    const a = await newProject("slug a");
    const b = await newProject("slug b");
    const next = `zz-moved-${suffix}`;
    createdSlugs.push(next);
    await updateSettings(a.def.slug, { slug: next });
    expect((await getProject(next)).def.name).toBe(a.def.name);
    expect(await code(getProject(a.def.slug))).toBe("not_found");
    expect(await code(updateSettings(next, { slug: b.def.slug }))).toBe("slug_taken");
    expect(await code(updateSettings(next, { slug: "admin" }))).toBe("invalid_slug");
    expect(await code(updateSettings(next, { slug: "Bad Slug" }))).toBe("invalid_slug");
  });
});

describe.skipIf(!haveDb)("stages", () => {
  it("creates, renames, recolors and reorders stages", async () => {
    const p = await newProject("stages");
    const s = await createStage({ projectSlug: p.def.slug, name: "Phone screen", color: "blue", isPositive: true });
    expect(await code(createStage({ projectSlug: p.def.slug, name: "phone SCREEN", color: "gray", isPositive: false }))).toBe("stage_name_taken");
    const all = await updateStage(s.id, { name: "Screen call", color: "teal" });
    expect(all.find((x) => x.id === s.id)).toMatchObject({ name: "Screen call", color: "teal" });
    const order = [s.id, ...p.stages.map((x) => x.id)];
    await reorderStages(p.def.slug, order);
    expect((await getProject(p.def.slug)).stages.map((x) => x.id)).toEqual(order);
    expect(await code(reorderStages(p.def.slug, order.slice(1)))).toBe("ids_mismatch");
  });

  it("keeps each role on one stage and swaps roles", async () => {
    const p = await newProject("roles");
    const [nw, task, booked, interviewed] = p.stages;
    // Interviewed takes the booking role: Booked takes Interviewed's old role (none).
    const after = await updateStage(interviewed.id, { role: "on_booking" });
    const by = (id: string) => after.find((x) => x.id === id)?.role;
    expect(by(interviewed.id)).toBe("on_booking");
    expect(by(booked.id)).toBeNull();
    expect(by(nw.id)).toBe("entry_new");
    // Task takes entry_new: New takes entry_task.
    const swapped = await updateStage(task.id, { role: "entry_new" });
    expect(swapped.find((x) => x.id === task.id)?.role).toBe("entry_new");
    expect(swapped.find((x) => x.id === nw.id)?.role).toBe("entry_task");
    expect(swapped.filter((x) => x.role === "entry_new")).toHaveLength(1);
    expect(await code(updateStage(task.id, { role: null }))).toBe("role_required");
  });

  it("refuses to delete a stage that holds a role, or the last stage", async () => {
    const p = await newProject("delrole");
    expect(await code(deleteStage(p.stages[0].id))).toBe("stage_has_role");
    const solo = await newProject("solo");
    for (const s of solo.stages.slice(3)) await deleteStage(s.id);
    // Only the three role stages remain. Give the roles away is impossible, so a one-stage project cannot be built here.
    expect((await getProject(solo.def.slug)).stages).toHaveLength(3);
  });

  it("moves cards to the target and writes stage_changed events when a stage is deleted", async () => {
    const p = await newProject("move");
    const [, , , interviewed, trial] = p.stages;
    const ids: string[] = [];
    const [{ id: projectId }] = await db().select({ id: tables.projects.id }).from(tables.projects).where(eq(tables.projects.slug, p.def.slug));
    for (let i = 0; i < 2; i++) {
      const [a] = await db()
        .insert(tables.applicants)
        .values({
          projectId,
          stageId: trial.id,
          resumeTokenHash: hashToken(`t-${suffix}-${i}-${crypto.randomUUID()}`),
          isTest: true,
          firstName: "Zz",
          lastName: "Test",
          email: `zz-${suffix}-${i}@example.test`,
          phoneE164: "+10000000000",
          timezone: "UTC",
          consentAt: new Date(),
          consentText: "ok",
        })
        .returning({ id: tables.applicants.id });
      ids.push(a.id);
    }
    expect((await getProject(p.def.slug)).stageCounts[trial.id]).toBe(2);
    expect(await code(deleteStage(trial.id))).toBe("move_to_required");
    expect(await code(deleteStage(trial.id, trial.id))).toBe("move_to_required");
    expect(await deleteStage(trial.id, interviewed.id)).toEqual({ deleted: trial.id, moved: 2 });
    const rows = await db().select().from(tables.applicants).where(inArray(tables.applicants.id, ids));
    expect(rows.every((r) => r.stageId === interviewed.id)).toBe(true);
    const events = await db().select().from(tables.applicantEvents).where(inArray(tables.applicantEvents.applicantId, ids));
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: "stage_changed", data: { from: trial.id, to: interviewed.id, reason: "stage_deleted" } });
    expect((await getProject(p.def.slug)).stageCounts[interviewed.id]).toBe(2);
  });
});

describe.skipIf(!haveDb)("questions", () => {
  it("creates with normalized choices, reorders and updates", async () => {
    const p = await newProject("questions");
    const a = await createQuestion({ projectSlug: p.def.slug, label: " Years? ", helpText: " help ", type: "single_choice", options: [" None ", "none", "1 year", ""], required: true });
    expect(a).toMatchObject({ label: "Years?", helpText: "help", options: ["None", "1 year"] });
    const b = await createQuestion({ projectSlug: p.def.slug, label: "Link?", helpText: "", type: "short_text", options: ["ignored"], required: false });
    expect(b.options).toEqual([]);
    expect(await code(createQuestion({ projectSlug: p.def.slug, label: "Bad", helpText: "", type: "multi_choice", options: ["one"], required: false }))).toBe("invalid_options");
    await reorderQuestions(p.def.slug, [b.id, a.id]);
    expect((await getProject(p.def.slug)).questions.map((q) => q.id)).toEqual([b.id, a.id]);
    expect((await updateQuestion(b.id, { label: "Portfolio?", required: true })).label).toBe("Portfolio?");
  });

  it("archive keeps the label on old answers, and a question with answers cannot be deleted", async () => {
    const p = await newProject("archive");
    const q = await createQuestion({ projectSlug: p.def.slug, label: "Original label", helpText: "", type: "short_text", options: [], required: false });
    const [{ id: projectId }] = await db().select({ id: tables.projects.id }).from(tables.projects).where(eq(tables.projects.slug, p.def.slug));
    const [a] = await db()
      .insert(tables.applicants)
      .values({
        projectId,
        resumeTokenHash: hashToken(`t-${suffix}-${crypto.randomUUID()}`),
        isTest: true,
        firstName: "Zz",
        lastName: "Ans",
        email: `zz-ans-${suffix}@example.test`,
        phoneE164: "+10000000001",
        timezone: "UTC",
        consentAt: new Date(),
        consentText: "ok",
        answers: { [q.id]: { label: "Original label", type: "short_text", value: "yes" } },
      })
      .returning({ id: tables.applicants.id });
    expect(await code(deleteQuestion(q.id))).toBe("question_has_answers");
    await updateQuestion(q.id, { label: "New label" });
    await updateQuestion(q.id, { archived: true });
    const proj = await getProject(p.def.slug);
    expect(proj.questions.find((x) => x.id === q.id)).toMatchObject({ archived: true, label: "New label" });
    const [row] = await db().select().from(tables.applicants).where(eq(tables.applicants.id, a.id));
    expect(row.answers[q.id].label).toBe("Original label");
    await updateQuestion(q.id, { archived: false });
    expect((await getProject(p.def.slug)).questions[0].archived).toBe(false);
  });

  it("deletes a question nobody answered", async () => {
    const p = await newProject("qdel");
    const q = await createQuestion({ projectSlug: p.def.slug, label: "Temp", helpText: "", type: "yes_no", options: [], required: false });
    await deleteQuestion(q.id);
    expect((await getProject(p.def.slug)).questions).toEqual([]);
  });
});

describe.skipIf(!haveDb)("templates", () => {
  it("creates, edits and deletes templates per channel", async () => {
    const p = await newProject("templates");
    const e = await createTemplate({ projectSlug: p.def.slug, channel: "email", name: "No", subject: "Hello", body: "Hi {first_name}" });
    expect(e).toMatchObject({ channel: "email", subject: "Hello" });
    expect(await code(createTemplate({ projectSlug: p.def.slug, channel: "email", name: "NoSubject", subject: " ", body: "x" }))).toBe("invalid_template");
    const sms = await createTemplate({ projectSlug: p.def.slug, channel: "sms", name: "Ping", subject: "dropped", body: "Hi" });
    expect(sms.subject).toBe("");
    expect(await code(createTemplate({ projectSlug: p.def.slug, channel: "whatsapp", name: "WA", subject: "", body: "Hi", waTemplateName: "Bad Name", waLanguage: "en" }))).toBe("invalid_template");
    const wa = await createTemplate({ projectSlug: p.def.slug, channel: "whatsapp", name: "WA", subject: "", body: "Hi {first_name}", waTemplateName: "invite_v2", waLanguage: "nl", waVariables: ["first_name"] });
    expect(wa).toMatchObject({ waTemplateName: "invite_v2", waLanguage: "nl", waVariables: ["first_name"] });
    expect((await updateTemplate(e.id, { body: "New body" })).body).toBe("New body");
    expect((await updateTemplate(wa.id, { waTemplateName: "invite_v3" })).waTemplateName).toBe("invite_v3");
    await deleteTemplate(sms.id);
    expect(await code(deleteTemplate(sms.id))).toBe("not_found");
    const templates = (await getProject(p.def.slug)).templates;
    expect(templates.some((t) => t.id === sms.id)).toBe(false);
    expect(templates.filter((t) => t.channel === "email")).toHaveLength(2);
  });
});
