import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { closeDb, db, tables } from "@/platform/db";
import { putObject, deleteObject } from "@/platform/r2";
import { hashToken } from "@/shared/token-hash";

const haveDb = Boolean(process.env.TEST_DATABASE_URL);
const haveR2 = Boolean(process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID);
if (haveDb) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.R2_KEY_PREFIX = "test/";
process.env.ADMIN_KEY ||= "t".repeat(48);

const suffix = crypto.randomUUID().slice(0, 8);
const slug = `fa-test-${suffix}`;
const closedSlug = `fa-closed-${suffix}`;
let projectId = "";
let closedId = "";
let questionId = "";
const r2Keys: string[] = [];
const ipOf = (n: number) => `203.0.113.${n}-${suffix}`;

function startReq(ip: string, headers: Record<string, string> = {}) {
  return new Request("http://x/api/apply/start", { method: "POST", headers: { "x-forwarded-for": ip, ...headers } });
}
// A phone number that already finished this project is dropped silently, so each payload gets its own number by default.
let phoneCounter = 0;
const nextPhone = () => `(415) 555-01${String(phoneCounter++ % 100).padStart(2, "0")}`;
function payload(over: Record<string, unknown> = {}) {
  return {
    projectSlug: slug,
    firstName: "Sam",
    lastName: "Rivera",
    email: `sam-${suffix}@example.com`,
    phone: nextPhone(),
    phoneCountry: "US",
    whatsappOk: true,
    timezone: "America/New_York",
    consent: true,
    answers: { [questionId]: "3 to 5 years" },
    utm: { utm_source: "t" },
    inAppBrowser: false,
    ...over,
  };
}

describe.skipIf(!haveDb)("funnel api", () => {
  let api: typeof import("@/features/applicant-funnel/server");

  beforeAll(async () => {
    api = await import("@/features/applicant-funnel/server");
    const base = { videoPrompt: "p", thankYouText: "t" };
    const [p] = await db().insert(tables.projects).values({ slug, name: "FA test", ...base, taskAllowFile: true }).returning();
    const [c] = await db().insert(tables.projects).values({ slug: closedSlug, name: "Closed", status: "closed", ...base }).returning();
    projectId = p.id;
    closedId = c.id;
    const [q] = await db()
      .insert(tables.projectQuestions)
      .values({ projectId, label: "Years?", type: "single_choice", options: ["None", "3 to 5 years"], required: true })
      .returning();
    questionId = q.id;
    await db().insert(tables.stages).values([
      { projectId, name: "New", position: 0, role: "entry_new" },
      { projectId, name: "Did task", position: 1, role: "entry_task" },
    ]);
  });

  afterAll(async () => {
    for (const k of r2Keys) await deleteObject(k).catch(() => {});
    await db().delete(tables.projects).where(inArray(tables.projects.id, [projectId, closedId].filter(Boolean)));
    await db().delete(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.route, "start"));
    await closeDb();
  });

  it("loads the project, unknown slug is null, closed stays closed", async () => {
    expect((await api.getFunnelProject(slug))?.questions).toHaveLength(1);
    expect(await api.getFunnelProject(`nope-${suffix}`)).toBeNull();
    expect((await api.getFunnelProject(closedSlug))?.status).toBe("closed");
  });

  it("starts an application, once per idempotency key, and links a repeat applicant", async () => {
    const key = `key-${crypto.randomUUID()}`;
    const body = payload();
    const first = (await api.startApplication(startReq(ipOf(1)), body, key)) as { applicant_id: string; resume_token: string };
    const replay = await api.startApplication(startReq(ipOf(1)), body, key);
    expect(replay).toEqual(first);
    const rows = await db().select().from(tables.applicants).where(eq(tables.applicants.projectId, projectId));
    expect(rows).toHaveLength(1);
    expect(rows[0].funnelStep).toBe("form_done");
    expect(rows[0].stageId).toBeNull();
    expect(rows[0].appliedBefore).toBe(false);
    expect(rows[0].answers[questionId].value).toBe("3 to 5 years");
    const events = await db().select().from(tables.applicantEvents).where(eq(tables.applicantEvents.applicantId, first.applicant_id));
    expect(events.map((e) => e.type)).toEqual(["form_submitted"]);

    // Same email and same phone, but the first one never finished, so this one is saved and linked.
    const second = (await api.startApplication(startReq(ipOf(2)), payload({ phone: body.phone }), `key-${crypto.randomUUID()}`)) as { applicant_id: string };
    const [again] = await db().select().from(tables.applicants).where(eq(tables.applicants.id, second.applicant_id));
    expect(again.appliedBefore).toBe(true);
    expect(again.previousApplicantId).toBe(first.applicant_id);
  });

  it("drops a phone number that already finished, saves one that only quit halfway", async () => {
    const phone = nextPhone();
    const k = () => `key-${crypto.randomUUID()}`;
    const count = async () => (await db().select().from(tables.applicants).where(eq(tables.applicants.projectId, projectId))).length;
    const a = (await api.startApplication(startReq(ipOf(30)), payload({ phone, email: `dup-a-${suffix}@example.com` }), k())) as { applicant_id: string };

    // Quit halfway: the same number can apply again and is saved.
    const b = (await api.startApplication(startReq(ipOf(31)), payload({ phone: phone.replace("(415) ", "+1 415 "), email: `dup-b-${suffix}@example.com` }), k())) as { applicant_id: string; resume_token: string };
    expect(b.resume_token.startsWith("shadow.")).toBe(false);
    const saved = await count();

    // Once one has finished, the same number gets a shadow session and nothing is stored.
    await db().update(tables.applicants).set({ funnelStep: "completed", completedAt: new Date() }).where(eq(tables.applicants.id, a.applicant_id));
    const c = (await api.startApplication(startReq(ipOf(32)), payload({ phone, email: `dup-c-${suffix}@example.com` }), k())) as { applicant_id: string; resume_token: string };
    expect(c.resume_token.startsWith("shadow.")).toBe(true);
    expect(await count()).toBe(saved);
    expect(await db().select().from(tables.applicants).where(eq(tables.applicants.id, c.applicant_id))).toHaveLength(0);

    // The shadow session answers every later step like a real one, and still writes nothing.
    expect(await api.submitTask({ resumeToken: c.resume_token, skip: true }, k())).toEqual({ stage: "entry_new" });
    await expect(api.completeVideo({ resumeToken: c.resume_token, key: "videos/x/y.webm", mime: "video/webm", bytes: 10, seconds: 3, audioOnly: false, retakeUsed: false })).rejects.toMatchObject({ status: 400 });
    expect(await count()).toBe(saved);

    // The test console can reuse a number.
    const header = { [api.TEST_CONSOLE_HEADER]: api.signTestConsole(process.env.ADMIN_KEY as string) };
    const t = (await api.startApplication(startReq(ipOf(33), header), payload({ phone, email: `dup-t-${suffix}@example.com` }), k())) as { resume_token: string };
    expect(t.resume_token.startsWith("shadow.")).toBe(false);
  });

  it("rejects bad answers, unknown and closed projects", async () => {
    const k = () => `key-${crypto.randomUUID()}`;
    await expect(api.startApplication(startReq(ipOf(3)), payload({ answers: {} }), k())).rejects.toMatchObject({ status: 400 });
    await expect(api.startApplication(startReq(ipOf(3)), payload({ answers: { [questionId]: "bogus" } }), k())).rejects.toMatchObject({ status: 400 });
    await expect(api.startApplication(startReq(ipOf(3)), payload({ projectSlug: "nope-x" }), k())).rejects.toMatchObject({ status: 404 });
    await expect(api.startApplication(startReq(ipOf(3)), payload({ projectSlug: closedSlug }), k())).rejects.toMatchObject({ status: 403 });
    await expect(api.startApplication(startReq(ipOf(3)), payload({ consent: false }), k())).rejects.toMatchObject({ status: 400 });
  });

  it("limits to 5 per IP and lets a signed test-console header through", async () => {
    const ip = ipOf(9);
    for (let i = 0; i < 5; i++) {
      await api.startApplication(startReq(ip), payload({ email: `rl${i}-${suffix}@example.com` }), `key-${crypto.randomUUID()}`);
    }
    await expect(api.startApplication(startReq(ip), payload({ email: `rl6-${suffix}@example.com` }), `key-${crypto.randomUUID()}`)).rejects.toMatchObject({ status: 429 });
    const signed = { [api.TEST_CONSOLE_HEADER]: api.signTestConsole(process.env.ADMIN_KEY as string) };
    const ok = (await api.startApplication(startReq(ip, signed), payload({ email: `rl7-${suffix}@example.com` }), `key-${crypto.randomUUID()}`)) as { applicant_id: string };
    const [row] = await db().select().from(tables.applicants).where(eq(tables.applicants.id, ok.applicant_id));
    expect(row.isTest).toBe(true);
  }, 30_000);

  it("detects the honeypot", () => {
    expect(api.isHoneypot({ website: "http://spam" })).toBe(true);
    expect(api.isHoneypot({ website: "" })).toBe(false);
    expect(Object.keys(api.fakeSession())).toEqual(["applicant_id", "resume_token"]);
  });

  describe.skipIf(!haveR2)("video, task and handoff", () => {
    it("runs the whole flow", async () => {
      const email = `flow-${suffix}@example.com`;
      const s = (await api.startApplication(startReq(ipOf(20), {}), payload({ email }), `key-${crypto.randomUUID()}`)) as { applicant_id: string; resume_token: string };
      let token = s.resume_token;

      // Only the SHA-256 hash is stored: no column holds the plaintext token.
      const [stored] = await db().select().from(tables.applicants).where(eq(tables.applicants.id, s.applicant_id));
      expect(stored.resumeTokenHash).toBe(hashToken(token));
      expect(Object.values(stored).some((v) => v === token)).toBe(false);

      await expect(api.createUploadUrls({ resumeToken: "bad", kind: "video", mime: "video/webm", withThumb: false, bytes: 11 })).rejects.toMatchObject({ status: 404 });
      await expect(api.createUploadUrls({ resumeToken: token, kind: "video", mime: "text/html", withThumb: false, bytes: 11 })).rejects.toMatchObject({ status: 400 });
      const urls = await api.createUploadUrls({ resumeToken: token, kind: "video", mime: "video/webm;codecs=vp9,opus", withThumb: true, bytes: 11, thumbBytes: 5 });
      expect(urls.key).toContain(`test/videos/${slug}/${s.applicant_id}/`);
      expect(urls.putUrl).toContain("X-Amz-Signature");
      expect(urls.thumbKey).toContain(`test/thumbs/${slug}/`);

      // task before video is refused
      await expect(api.submitTask({ resumeToken: token, skip: true }, `key-${crypto.randomUUID()}`)).rejects.toMatchObject({ status: 409 });

      // missing object, then wrong byte count, then a good one
      const done = { resumeToken: token, key: urls.key, mime: "video/webm", bytes: 11, seconds: 30, audioOnly: false, retakeUsed: false };
      await expect(api.completeVideo(done)).rejects.toMatchObject({ code: "upload_missing" });
      await putObject(urls.key, "hello world", "video/webm");
      r2Keys.push(urls.key);
      await expect(api.completeVideo({ ...done, bytes: 5 })).rejects.toMatchObject({ code: "upload_incomplete" });
      await expect(api.completeVideo({ ...done, key: "test/videos/other/x/1.webm" })).rejects.toMatchObject({ status: 400 });
      await api.completeVideo(done);
      const [afterVideo] = await db().select().from(tables.applicants).where(eq(tables.applicants.id, s.applicant_id));
      expect(afterVideo).toMatchObject({ funnelStep: "video_done", videoKey: urls.key, videoBytes: 11, videoSeconds: 30, thumbKey: null });

      // submit the task once, replay returns the same
      const tk = `key-${crypto.randomUUID()}`;
      expect(await api.submitTask({ resumeToken: token, skip: false, text: "Hi there" }, tk)).toEqual({ stage: "entry_task" });
      expect(await api.submitTask({ resumeToken: token, skip: false, text: "Hi there" }, tk)).toEqual({ stage: "entry_task" });
      const [fin] = await db().select().from(tables.applicants).where(eq(tables.applicants.id, s.applicant_id));
      expect(fin).toMatchObject({ funnelStep: "completed", didTask: true, taskText: "Hi there" });
      expect(fin.completedAt).not.toBeNull();
      expect(fin.stageId).not.toBeNull();
      const events = await db().select().from(tables.applicantEvents).where(eq(tables.applicantEvents.applicantId, s.applicant_id));
      expect(events.map((e) => e.type).sort()).toEqual(["application_completed", "form_submitted", "stage_changed", "task_submitted", "video_saved"]);

      // handoff is one time and expires
      const h = await api.createHandoff(token);
      const t = h.url.split("/").pop() as string;
      const used = await api.consumeHandoff(t);
      // The old token is hashed in the database, so handoff issues a fresh one and the old one stops working.
      expect(used).toMatchObject({ slug });
      const newToken = (used as { resumeToken: string }).resumeToken;
      expect(newToken).not.toBe(token);
      await expect(api.createHandoff(token)).rejects.toMatchObject({ status: 404 });
      const [afterHand] = await db().select().from(tables.applicants).where(eq(tables.applicants.id, s.applicant_id));
      expect(afterHand.resumeTokenHash).toBe(hashToken(newToken));
      token = newToken;
      expect(await api.consumeHandoff(t)).toBeNull();
      const h2 = await api.createHandoff(token);
      await db().update(tables.applicants).set({ handoffExpiresAt: new Date(Date.now() - 1000) }).where(eq(tables.applicants.id, s.applicant_id));
      expect(await api.consumeHandoff(h2.url.split("/").pop() as string)).toBeNull();
      const types = (await db().select().from(tables.applicantEvents).where(eq(tables.applicantEvents.applicantId, s.applicant_id))).map((e) => e.type);
      expect(types.filter((x) => x === "handoff_used")).toHaveLength(1);
    }, 30_000);

    it("skip lands in New; logs go to system_errors", async () => {
      const s = (await api.startApplication(startReq(ipOf(21)), payload({ email: `skip-${suffix}@example.com` }), `key-${crypto.randomUUID()}`)) as { applicant_id: string; resume_token: string };
      await db().update(tables.applicants).set({ funnelStep: "video_done" }).where(eq(tables.applicants.id, s.applicant_id));
      expect(await api.submitTask({ resumeToken: s.resume_token, skip: true }, `key-${crypto.randomUUID()}`)).toEqual({ stage: "entry_new" });
      await api.logClientEvent({ type: `upload_failed_${suffix}`, data: { status: 500 }, resumeToken: s.resume_token });
      try {
        const [e] = await db().select().from(tables.systemErrors).where(eq(tables.systemErrors.message, `upload_failed_${suffix}`));
        expect(e.applicantId).toBe(s.applicant_id);
      } finally {
        // Also when the check fails: a left row shows up as a red banner on the test dashboard.
        await db().delete(tables.systemErrors).where(eq(tables.systemErrors.message, `upload_failed_${suffix}`));
      }
    });
  });
});
