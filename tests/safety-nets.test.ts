import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { closeDb, db, tables } from "@/platform/db";
import { hashToken } from "@/shared/token-hash";
import { deleteObject, headObject, putObject, withPrefix } from "@/platform/r2";

const haveDb = Boolean(process.env.TEST_DATABASE_URL);
const haveR2 = Boolean(process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID);

if (haveDb) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.R2_KEY_PREFIX = "test/";
process.env.ADMIN_KEY ||= "t".repeat(48);

afterAll(closeDb);

const run = `st-${crypto.randomUUID().slice(0, 8)}`;
const day = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * day);
const ids: Record<string, string> = {};
const keys: string[] = [];
let projectId = "";

async function applicant(name: string, opts: { age: number; stage: string | null; video?: boolean; thumb?: boolean; task?: boolean }) {
  const mk = (kind: string) => withPrefix(`safety/${run}/${name}-${kind}`);
  const v = opts.video === false ? null : mk("video.webm");
  const t = opts.thumb === false ? null : mk("thumb.jpg");
  const f = opts.task ? mk("task.pdf") : null;
  for (const k of [v, t, f]) if (k) { await putObject(k, "x", "application/octet-stream"); keys.push(k); }
  const [row] = await db()
    .insert(tables.applicants)
    .values({
      projectId, stageId: opts.stage, resumeTokenHash: hashToken(`${run}-${name}`), isTest: true,
      firstName: "S", lastName: name, email: `${run}-${name}@forge-hire.test`, phoneE164: "+31612345678",
      timezone: "UTC", consentAt: new Date(), consentText: "x", funnelStep: "completed",
      videoKey: v, thumbKey: t, taskFileKey: f, createdAt: ago(opts.age),
    })
    .returning({ id: tables.applicants.id });
  ids[name] = row.id;
}

/** An applicant who never completed a video: no keys on the row, but stray uploads under their own R2 folders. */
const strayKeys: Record<string, string[]> = {};
async function strayApplicant(name: string, opts: { age: number; stage: string | null }) {
  const id = crypto.randomUUID();
  const stray = [
    withPrefix(`videos/${run}/${id}/1700000000000.webm`),
    withPrefix(`thumbs/${run}/${id}/1700000000000.jpg`),
    withPrefix(`tasks/${run}/${id}/ab12cd34-cv.pdf`),
  ];
  for (const k of stray) { await putObject(k, "x", "application/octet-stream"); keys.push(k); }
  strayKeys[name] = stray;
  await db().insert(tables.applicants).values({
    id, projectId, stageId: opts.stage, resumeTokenHash: hashToken(`${run}-${name}`), isTest: true,
    firstName: "S", lastName: name, email: `${run}-${name}@forge-hire.test`, phoneE164: "+31612345678",
    timezone: "UTC", consentAt: new Date(), consentText: "x", funnelStep: "form_done", createdAt: ago(opts.age),
  });
  ids[name] = id;
}

describe.skipIf(!haveDb || !haveR2)("retention, integrity and banners against the test database", { timeout: 60_000 }, () => {
  let stageNormal = "";
  let stagePositive = "";
  let stageRejected = "";

  beforeAll(async () => {
    const [p] = await db().insert(tables.projects).values({ slug: run, name: run, videoPrompt: "x", thankYouText: "x" }).returning({ id: tables.projects.id });
    projectId = p.id;
    const st = await db().insert(tables.stages).values([
      { projectId, name: "Normal", isPositive: false },
      { projectId, name: "Hired", isPositive: true },
      { projectId, name: "Rejected", isPositive: false, isFinal: true },
    ]).returning();
    stageNormal = st.find((s) => s.name === "Normal")!.id;
    stagePositive = st.find((s) => s.name === "Hired")!.id;
    stageRejected = st.find((s) => s.name === "Rejected")!.id;
    await applicant("old-normal", { age: 40, stage: stageNormal, task: true });
    await applicant("old-positive", { age: 40, stage: stagePositive });
    await applicant("old-dnf", { age: 40, stage: null });
    await applicant("young", { age: 5, stage: stageNormal });
    await applicant("booked-31", { age: 31, stage: stagePositive });
    await applicant("rejected-29", { age: 29, stage: stageRejected });
    await applicant("rejected-31", { age: 31, stage: stageRejected });
    await applicant("rejected-moved-today", { age: 60, stage: stageRejected });
    await db().update(tables.applicants).set({ lastStageChangeAt: new Date() }).where(eq(tables.applicants.id, ids["rejected-moved-today"]));
    await db().insert(tables.applicantEvents).values({ applicantId: ids["rejected-moved-today"], type: "stage_changed", data: {} });
    await applicant("new-31", { age: 31, stage: stageNormal, task: true });
    await db().insert(tables.applicantEvents).values({ applicantId: ids["new-31"], type: "note", data: {}, createdAt: ago(31) });
    await db().insert(tables.messages).values({ applicantId: ids["new-31"], channel: "email", direction: "out", body: "hi", status: "sent" });
    await strayApplicant("old-novideo", { age: 40, stage: null });
    await strayApplicant("old-novideo-positive", { age: 40, stage: stagePositive });
    await strayApplicant("young-novideo", { age: 5, stage: null });
    // A neighbour's file in the same project: it must never be touched by someone else's sweep.
    const neighbour = withPrefix(`videos/${run}/${crypto.randomUUID()}/1.webm`);
    await putObject(neighbour, "x", "application/octet-stream");
    keys.push(neighbour);
    strayKeys.neighbour = [neighbour];
  }, 60_000);

  afterAll(async () => {
    const mine = Object.values(ids);
    await db().delete(tables.systemErrors).where(inArray(tables.systemErrors.applicantId, mine));
    await db().delete(tables.projects).where(eq(tables.projects.id, projectId)); // cascades applicants, events
    for (const k of keys) await deleteObject(k).catch(() => undefined);
  });

  it("dry run lists work and changes nothing", async () => {
    const { runRetention } = await import("@/features/retention/server");
    const auditBefore = await db().select().from(tables.adminAudit).where(eq(tables.adminAudit.action, "retention_run"));
    const r = await runRetention({ dryRun: true });
    expect(r.dryRun).toBe(true);
    expect(r.deleted).toBe(0);
    expect(r.sample.map((s) => s.applicantId)).toEqual(expect.arrayContaining([ids["old-normal"], ids["old-dnf"], ids["new-31"], ids["rejected-31"]]));
    expect(r.sample.map((s) => s.applicantId)).not.toContain(ids["rejected-29"]);
    expect(await headObject(withPrefix(`safety/${run}/old-normal-video.webm`))).not.toBeNull();
    const rows = await db().select().from(tables.applicants).where(inArray(tables.applicants.id, Object.values(ids)));
    expect(rows).toHaveLength(Object.keys(ids).length);
    // Applicants without a video are counted too, and nothing is deleted in a dry run.
    expect(r.sample.map((s) => s.applicantId)).toContain(ids["old-novideo"]);
    expect(r.sample.find((s) => s.applicantId === ids["old-novideo"])?.files).toBe(3);
    for (const k of strayKeys["old-novideo"]) expect(await headObject(k)).not.toBeNull();
    const auditAfter = await db().select().from(tables.adminAudit).where(eq(tables.adminAudit.action, "retention_run"));
    expect(auditAfter).toHaveLength(auditBefore.length);
  });

  it("deletes eligible applicants completely and keeps the rest", async () => {
    const { runRetention } = await import("@/features/retention/server");
    const r = await runRetention({});
    expect(r.failed).toBe(0);
    expect(r.done).toBe(true);
    expect(r.deleted).toBeGreaterThanOrEqual(5);

    const rows = await db().select().from(tables.applicants).where(inArray(tables.applicants.id, Object.values(ids)));
    const present = new Set(rows.map((x) => x.id));
    for (const gone of ["old-normal", "old-dnf", "new-31", "rejected-31", "old-novideo"]) expect(present.has(ids[gone]), gone).toBe(false);
    for (const kept of ["old-positive", "booked-31", "rejected-29", "rejected-moved-today", "young", "old-novideo-positive", "young-novideo"]) expect(present.has(ids[kept]), kept).toBe(true);

    // 31 day old New applicant: row, events, messages and every R2 object are gone.
    for (const kind of ["video.webm", "thumb.jpg", "task.pdf"]) {
      expect(await headObject(withPrefix(`safety/${run}/new-31-${kind}`))).toBeNull();
      expect(await headObject(withPrefix(`safety/${run}/old-normal-${kind}`))).toBeNull();
    }
    expect(await headObject(withPrefix(`safety/${run}/old-dnf-video.webm`))).toBeNull();
    expect(await db().select().from(tables.applicantEvents).where(eq(tables.applicantEvents.applicantId, ids["new-31"]))).toHaveLength(0);
    expect(await db().select().from(tables.messages).where(eq(tables.messages.applicantId, ids["new-31"]))).toHaveLength(0);

    // Kept applicants keep their files.
    expect(await headObject(withPrefix(`safety/${run}/booked-31-video.webm`))).not.toBeNull();
    expect(await headObject(withPrefix(`safety/${run}/old-positive-video.webm`))).not.toBeNull();
    expect(await headObject(withPrefix(`safety/${run}/rejected-29-video.webm`))).not.toBeNull();
    expect(await headObject(withPrefix(`safety/${run}/rejected-moved-today-video.webm`))).not.toBeNull();
    expect(await headObject(withPrefix(`safety/${run}/young-video.webm`))).not.toBeNull();

    // B012: stray uploads of applicants who never completed a video are swept from their own folders only.
    for (const k of strayKeys["old-novideo"]) expect(await headObject(k)).toBeNull();
    for (const k of strayKeys["old-novideo-positive"]) expect(await headObject(k)).not.toBeNull();
    for (const k of strayKeys["young-novideo"]) expect(await headObject(k)).not.toBeNull();
    for (const k of strayKeys.neighbour) expect(await headObject(k)).not.toBeNull();

    // One audit row per run, counts only.
    const audit = await db().select().from(tables.adminAudit).where(eq(tables.adminAudit.action, "retention_run"));
    const last = audit.sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())[0];
    expect(Object.keys(last.detail).sort()).toEqual(["deleted", "done", "eligible", "failed", "files"]);
    expect(last.detail.deleted).toBe(r.deleted);
  });

  it("is safe to run again", async () => {
    const { runRetention } = await import("@/features/retention/server");
    const before = await db().select().from(tables.applicants).where(inArray(tables.applicants.id, Object.values(ids)));
    const r = await runRetention({});
    expect(r.failed).toBe(0);
    const after = await db().select().from(tables.applicants).where(inArray(tables.applicants.id, Object.values(ids)));
    expect(after).toHaveLength(before.length);
  });

  it("an applicant moved out of a positive stage today gets 30 days, an old one in a non-positive stage does not", async () => {
    const { runRetention } = await import("@/features/retention/server");
    const { moveStage } = await import("@/features/applicants/server");
    await moveStage(ids["old-positive"], stageRejected);
    await runRetention({});
    expect(await headObject(withPrefix(`safety/${run}/old-positive-video.webm`))).not.toBeNull();
    // 31 days later the same applicant is eligible.
    const r = await runRetention({ dryRun: true, sampleLimit: 10_000, now: new Date(Date.now() + 31 * day) });
    expect(r.sample.map((s) => s.applicantId)).toContain(ids["old-positive"]);
  });

  it("an applicant moved from Rejected into a positive stage is no longer eligible", async () => {
    const { runRetention } = await import("@/features/retention/server");
    await db().update(tables.applicants).set({ stageId: stagePositive }).where(eq(tables.applicants.id, ids["rejected-29"]));
    const r = await runRetention({ dryRun: true, sampleLimit: 10_000, now: new Date(Date.now() + 90 * day) });
    expect(r.sample.map((s) => s.applicantId)).not.toContain(ids["rejected-29"]);
  });

  it("resumes by cursor when the time budget runs out", async () => {
    const { runRetention } = await import("@/features/retention/server");
    const r = await runRetention({ dryRun: true, budgetMs: -1, after: "00000000-0000-0000-0000-000000000000" });
    expect(r.done).toBe(false);
    expect(r.nextCursor).toBe("00000000-0000-0000-0000-000000000000");
  });

  it("integrity flags a missing file once and does not stack duplicates", async () => {
    const { runIntegrity } = await import("@/features/retention/server");
    await deleteObject(withPrefix(`safety/${run}/young-thumb.jpg`));
    await runIntegrity({});
    await runIntegrity({});
    const errs = await db().select().from(tables.systemErrors).where(eq(tables.systemErrors.applicantId, ids["young"]));
    expect(errs).toHaveLength(1);
    expect(errs[0].source).toBe("integrity");
    expect((errs[0].data as { key: string }).key).toContain("young-thumb.jpg");
  });

  it("integrity dry run writes nothing", async () => {
    const { runIntegrity } = await import("@/features/retention/server");
    await db().delete(tables.systemErrors).where(eq(tables.systemErrors.applicantId, ids["young"]));
    const r = await runIntegrity({ dryRun: true });
    expect(r.sample.some((s) => s.applicantId === ids["young"])).toBe(true);
    const errs = await db().select().from(tables.systemErrors).where(eq(tables.systemErrors.applicantId, ids["young"]));
    expect(errs).toHaveLength(0);
  });

  it("banners follow system_errors and the backups table", async () => {
    const { getSystemAlerts, resolveAlert, checkLastBackup } = await import("@/features/backups/server");
    const saved = await db().select().from(tables.backups);
    await db().delete(tables.backups);
    const [err] = await db().insert(tables.systemErrors).values({ source: run, message: "boom", applicantId: ids["young"] }).returning();
    try {
      let alerts = await getSystemAlerts();
      expect(alerts.find((a) => a.id === "backup")?.title).toBe("No backup in the last 26 hours.");
      expect(alerts.find((a) => a.id === `errors:${run}`)?.detail).toBe("boom");
      expect((await checkLastBackup()).ok).toBe(false);

      await db().insert(tables.backups).values({ r2Key: "test/backups/x", bytes: 1, ok: true });
      expect((await checkLastBackup()).ok).toBe(true);
      await db().insert(tables.backups).values({ r2Key: "test/backups/y", bytes: 0, ok: false, error: "pg_dump failed", createdAt: new Date(Date.now() + 1000) });
      alerts = await getSystemAlerts();
      expect(alerts.find((a) => a.id === "backup")?.title).toBe("The last backup failed.");

      expect(await resolveAlert("backup")).toBe(false);
      expect(await resolveAlert(`errors:${run}`)).toBe(true);
      alerts = await getSystemAlerts();
      expect(alerts.some((a) => a.id === `errors:${run}`)).toBe(false);
    } finally {
      await db().delete(tables.systemErrors).where(eq(tables.systemErrors.id, err.id));
      await db().delete(tables.backups);
      if (saved.length) await db().insert(tables.backups).values(saved);
    }
  });
});
