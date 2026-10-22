import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { closeDb, db, tables } from "@/platform/db";
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
      projectId, stageId: opts.stage, resumeToken: `${run}-${name}`, isTest: true,
      firstName: "S", lastName: name, email: `${run}-${name}@forge-hire.test`, phoneE164: "+31612345678",
      timezone: "UTC", consentAt: new Date(), consentText: "x", funnelStep: "completed",
      videoKey: v, thumbKey: t, taskFileKey: f, createdAt: ago(opts.age),
    })
    .returning({ id: tables.applicants.id });
  ids[name] = row.id;
}

describe.skipIf(!haveDb || !haveR2)("retention, integrity and banners against the test database", () => {
  let stageNormal = "";
  let stagePositive = "";

  beforeAll(async () => {
    const [p] = await db().insert(tables.projects).values({ slug: run, name: run, videoPrompt: "x", thankYouText: "x" }).returning({ id: tables.projects.id });
    projectId = p.id;
    const st = await db().insert(tables.stages).values([
      { projectId, name: "Normal", isPositive: false },
      { projectId, name: "Hired", isPositive: true },
    ]).returning();
    stageNormal = st.find((s) => !s.isPositive)!.id;
    stagePositive = st.find((s) => s.isPositive)!.id;
    await applicant("old-normal", { age: 40, stage: stageNormal, task: true });
    await applicant("old-positive", { age: 40, stage: stagePositive });
    await applicant("old-dnf", { age: 40, stage: null });
    await applicant("young", { age: 5, stage: stageNormal });
  });

  afterAll(async () => {
    const mine = Object.values(ids);
    await db().delete(tables.systemErrors).where(inArray(tables.systemErrors.applicantId, mine));
    await db().delete(tables.projects).where(eq(tables.projects.id, projectId)); // cascades applicants, events
    for (const k of keys) await deleteObject(k).catch(() => undefined);
  });

  it("dry run lists work and changes nothing", async () => {
    const { runRetention } = await import("@/features/retention/server");
    const r = await runRetention({ dryRun: true });
    expect(r.dryRun).toBe(true);
    expect(r.sample.map((s) => s.applicantId)).toEqual(expect.arrayContaining([ids["old-normal"], ids["old-dnf"]]));
    expect(await headObject(withPrefix(`safety/${run}/old-normal-video.webm`))).not.toBeNull();
    const [row] = await db().select().from(tables.applicants).where(eq(tables.applicants.id, ids["old-normal"]));
    expect(row.videoDeletedAt).toBeNull();
  });

  it("deletes old files outside positive stages and keeps the rest", async () => {
    const { runRetention } = await import("@/features/retention/server");
    const r = await runRetention({});
    expect(r.failed).toBe(0);
    expect(r.done).toBe(true);

    for (const kind of ["video.webm", "thumb.jpg", "task.pdf"]) {
      expect(await headObject(withPrefix(`safety/${run}/old-normal-${kind}`))).toBeNull();
    }
    expect(await headObject(withPrefix(`safety/${run}/old-dnf-video.webm`))).toBeNull();
    expect(await headObject(withPrefix(`safety/${run}/old-positive-video.webm`))).not.toBeNull();
    expect(await headObject(withPrefix(`safety/${run}/young-video.webm`))).not.toBeNull();

    const rows = await db().select().from(tables.applicants).where(inArray(tables.applicants.id, Object.values(ids)));
    const by = Object.fromEntries(Object.entries(ids).map(([n, id]) => [n, rows.find((x) => x.id === id)!]));
    expect(by["old-normal"].videoDeletedAt).not.toBeNull();
    expect(by["old-dnf"].videoDeletedAt).not.toBeNull();
    expect(by["old-positive"].videoDeletedAt).toBeNull();
    expect(by["young"].videoDeletedAt).toBeNull();
    expect(by["old-normal"].firstName).toBe("S"); // text data stays

    const events = await db().select().from(tables.applicantEvents).where(and(eq(tables.applicantEvents.applicantId, ids["old-normal"]), eq(tables.applicantEvents.type, "media_deleted")));
    expect(events).toHaveLength(1);
  });

  it("is safe to run again", async () => {
    const { runRetention } = await import("@/features/retention/server");
    const before = await db().select().from(tables.applicantEvents).where(eq(tables.applicantEvents.applicantId, ids["old-normal"]));
    await runRetention({});
    const after = await db().select().from(tables.applicantEvents).where(eq(tables.applicantEvents.applicantId, ids["old-normal"]));
    expect(after).toHaveLength(before.length);
  });

  it("moves a card out of a positive stage and the next run deletes its files", async () => {
    const { runRetention } = await import("@/features/retention/server");
    await db().update(tables.applicants).set({ stageId: stageNormal }).where(eq(tables.applicants.id, ids["old-positive"]));
    await runRetention({});
    expect(await headObject(withPrefix(`safety/${run}/old-positive-video.webm`))).toBeNull();
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
