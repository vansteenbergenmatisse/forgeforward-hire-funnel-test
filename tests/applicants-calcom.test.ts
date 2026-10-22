import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

const haveDb = Boolean(process.env.TEST_DATABASE_URL);
if (haveDb) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.R2_KEY_PREFIX ||= "test/";
process.env.ADMIN_KEY ||= "t".repeat(48);

import { closeDb, db, tables } from "@/platform/db";
import { hashToken } from "@/shared/token-hash";
import { handleCalcomWebhook, signCalcomBody } from "@/features/bookings/server";
import {
  deleteApplicant,
  dismissUnmatchedBooking,
  getApplicant,
  linkUnmatchedBooking,
  listApplicants,
  listUnmatchedBookings,
  markRead,
  moveStage,
  setNotes,
  setScore,
} from "@/features/applicants/server";

const SECRET = "test-secret";
const run = Math.random().toString(36).slice(2, 10);
const opts = { secret: SECRET, nodeEnv: "test" };

let projectId = "";
let stageIds: Record<string, string> = {};
let applicantId = "";
let hiredApplicantId = "";
const email = `cal-${run}@example.test`;
const uids: string[] = [];

const hook = (trigger: string, uid: string, extra: Record<string, unknown> = {}, attendee = email) => {
  uids.push(uid);
  return JSON.stringify({
    triggerEvent: trigger,
    payload: {
      uid,
      title: "Interview",
      startTime: "2026-10-22T14:00:00Z",
      endTime: "2026-10-22T14:30:00Z",
      attendees: [{ email: attendee }],
      metadata: {},
      ...extra,
    },
  });
};
const signed = (raw: string) => handleCalcomWebhook(raw, signCalcomBody(raw, SECRET), opts);

async function makeApplicant(stageId: string | null, mail: string) {
  const [a] = await db()
    .insert(tables.applicants)
    .values({
      projectId,
      stageId,
      resumeTokenHash: hashToken(`rt-${crypto.randomUUID()}`),
      isTest: true,
      firstName: "Test",
      lastName: "Person",
      email: mail,
      phoneE164: "+15555550100",
      timezone: "UTC",
      consentAt: new Date(),
      consentText: "ok",
    })
    .returning({ id: tables.applicants.id });
  return a.id;
}

describe.skipIf(!haveDb)("cal.com webhook and applicant commands", () => {
  beforeAll(async () => {
    const [p] = await db()
      .insert(tables.projects)
      .values({ slug: `t-${run}`, name: "Test", videoPrompt: "v", thankYouText: "t" })
      .returning({ id: tables.projects.id });
    projectId = p.id;
    const rows = await db()
      .insert(tables.stages)
      .values([
        { projectId, name: "New", position: 0, role: "entry_new" },
        { projectId, name: "Interview booked", position: 1, role: "on_booking", isPositive: true },
        { projectId, name: "Hired", position: 2, isFinal: true },
        { projectId, name: "Trial", position: 3 },
      ])
      .returning();
    stageIds = Object.fromEntries(rows.map((r) => [r.name, r.id]));
    applicantId = await makeApplicant(stageIds["New"], email);
    hiredApplicantId = await makeApplicant(stageIds["Hired"], `hired-${run}@example.test`);
  });

  afterAll(async () => {
    const mails = [email, `hired-${run}@example.test`, `nobody-${run}@example.test`];
    await db().delete(tables.unmatchedBookings).where(inArray(tables.unmatchedBookings.attendeeEmail, mails));
    await db().delete(tables.processedWebhooks).where(inArray(tables.processedWebhooks.externalId, uids.flatMap((u) => [`${u}:BOOKING_CREATED`, `${u}:BOOKING_RESCHEDULED`, `${u}:BOOKING_CANCELLED`])));
    if (projectId) await db().delete(tables.projects).where(eq(tables.projects.id, projectId)); // cascades
    await closeDb();
  });

  it("rejects unsigned and badly signed webhooks without touching data", async () => {
    const raw = hook("BOOKING_CREATED", `u-bad-${run}`);
    expect(await handleCalcomWebhook(raw, null, opts)).toMatchObject({ status: 401 });
    expect(await handleCalcomWebhook(raw, signCalcomBody(raw, "wrong"), opts)).toMatchObject({ status: 401 });
    const a = await getApplicant(applicantId);
    expect(a?.booking).toBeNull();
    expect(a?.stageId).toBe(stageIds["New"]);
  });

  it("rejects when the secret is unset in production", async () => {
    const raw = hook("BOOKING_CREATED", `u-prod-${run}`);
    expect(await handleCalcomWebhook(raw, null, { secret: undefined, nodeEnv: "production" })).toMatchObject({ status: 503 });
  });

  it("signed BOOKING_CREATED saves the booking, moves to on_booking and writes events", async () => {
    const uid = `u1-${run}`;
    const out = await signed(hook("BOOKING_CREATED", uid));
    expect(out).toEqual({ status: 200, result: "applied" });
    const a = (await getApplicant(applicantId))!;
    expect(a.stageId).toBe(stageIds["Interview booked"]);
    expect(a.booking).toMatchObject({ status: "booked", start: "2026-10-22T14:00:00.000Z" });
    expect(a.events.map((e) => e.type)).toEqual(expect.arrayContaining(["booking_created", "stage_changed"]));
  });

  it("the same webhook twice acts once", async () => {
    const uid = `u1-${run}`;
    const before = (await getApplicant(applicantId))!.events.length;
    const out = await signed(hook("BOOKING_CREATED", uid));
    expect(out).toEqual({ status: 200, result: "duplicate" });
    expect((await getApplicant(applicantId))!.events.length).toBe(before);
  });

  it("a booking never pulls a card out of Hired", async () => {
    const mail = `hired-${run}@example.test`;
    const out = await signed(hook("BOOKING_CREATED", `u-hired-${run}`, {}, mail));
    expect(out).toMatchObject({ result: "applied" });
    const a = (await getApplicant(hiredApplicantId))!;
    expect(a.stageId).toBe(stageIds["Hired"]);
    expect(a.booking?.status).toBe("booked");
  });

  it("matches by metadata.applicant_id before email", async () => {
    const uid = `u-meta-${run}`;
    const out = await signed(hook("BOOKING_CREATED", uid, { metadata: { applicant_id: hiredApplicantId } }, `other-${run}@example.test`));
    expect(out).toMatchObject({ result: "applied" });
    const [row] = await db().select().from(tables.applicants).where(eq(tables.applicants.id, hiredApplicantId));
    expect(row.booking?.uid).toBe(uid);
  });

  it("reschedule updates the time and keeps the stage; cancel sets the badge", async () => {
    const out = await signed(
      hook("BOOKING_RESCHEDULED", `u2-${run}`, { rescheduleUid: `u1-${run}`, startTime: "2026-10-23T09:00:00Z", endTime: "2026-10-23T09:30:00Z" }),
    );
    expect(out).toMatchObject({ result: "applied" });
    let a = (await getApplicant(applicantId))!;
    expect(a.booking).toMatchObject({ status: "rescheduled", start: "2026-10-23T09:00:00.000Z" });
    expect(a.stageId).toBe(stageIds["Interview booked"]);

    // Cancel of the old uid is stale and ignored.
    expect(await signed(hook("BOOKING_CANCELLED", `u1-${run}`))).toMatchObject({ result: "stale" });
    expect((await getApplicant(applicantId))!.booking?.status).toBe("rescheduled");

    expect(await signed(hook("BOOKING_CANCELLED", `u2-${run}`, { cancellationReason: "sick" }))).toMatchObject({ result: "applied" });
    a = (await getApplicant(applicantId))!;
    expect(a.booking?.status).toBe("cancelled");
    expect(a.stageId).toBe(stageIds["Interview booked"]);
    expect(a.events.map((e) => e.type)).toEqual(expect.arrayContaining(["booking_rescheduled", "booking_cancelled"]));
  });

  it("an unknown email goes to unmatched_bookings, which can be linked once", async () => {
    const mail = `nobody-${run}@example.test`;
    const out = await signed(hook("BOOKING_CREATED", `u-un-${run}`, {}, mail));
    expect(out).toEqual({ status: 200, result: "unmatched" });
    const row = (await listUnmatchedBookings()).find((b) => b.email === mail)!;
    expect(row).toMatchObject({ title: "Interview", start: "2026-10-22T14:00:00.000Z" });

    const target = await makeApplicant(stageIds["New"], `link-${run}@example.test`);
    expect(await linkUnmatchedBooking(row.id, target)).toEqual({ ok: true });
    const a = (await getApplicant(target))!;
    expect(a.stageId).toBe(stageIds["Interview booked"]);
    expect(a.booking?.status).toBe("booked");
    expect(a.events.map((e) => e.type)).toContain("booking_created");
    expect(await linkUnmatchedBooking(row.id, target)).toEqual({ ok: false, error: "already_resolved" });
    expect((await listUnmatchedBookings()).find((b) => b.id === row.id)?.linkedApplicantId).toBe(target);
  });

  it("dismisses an unmatched booking", async () => {
    const mail = `nobody-${run}@example.test`;
    await signed(hook("BOOKING_CREATED", `u-un2-${run}`, {}, mail));
    const row = (await listUnmatchedBookings()).find((b) => b.email === mail && !b.linkedApplicantId && !b.dismissed)!;
    expect(await dismissUnmatchedBooking(row.id)).toBe(true);
    expect(await dismissUnmatchedBooking(row.id)).toBe(false);
    expect((await listUnmatchedBookings()).find((b) => b.id === row.id)?.dismissed).toBe(true);
  });

  it("ignores PING and bad JSON", async () => {
    expect(await signed(JSON.stringify({ triggerEvent: "PING" }))).toEqual({ status: 200, result: "ignored" });
    const bad = "{nope";
    expect(await handleCalcomWebhook(bad, signCalcomBody(bad, SECRET), opts)).toMatchObject({ status: 400 });
  });

  it("moves stage with an event, rejects a stage from another project", async () => {
    const id = await makeApplicant(stageIds["New"], `move-${run}@example.test`);
    const r = await moveStage(id, stageIds["Trial"]);
    expect(r.ok && r.value.stageId).toBe(stageIds["Trial"]);
    const ev = r.ok ? r.value.events.find((e) => e.type === "stage_changed") : undefined;
    expect(ev?.data).toEqual({ from: stageIds["New"], to: stageIds["Trial"] });
    expect(await moveStage(id, crypto.randomUUID())).toEqual({ ok: false, error: "bad_stage" });
  });

  it("sets score, notes and read flag; lists and filters", async () => {
    const id = await makeApplicant(null, `misc-${run}@example.test`);
    await db().update(tables.applicants).set({ unreadReply: true }).where(eq(tables.applicants.id, id));
    expect((await setScore(id, 4)).ok).toBe(true);
    expect((await setNotes(id, "good")).ok).toBe(true);
    const r = await markRead(id);
    expect(r.ok && r.value).toMatchObject({ score: 4, notes: "good", unreadReply: false });
    const dnf = await listApplicants({ projectSlug: `t-${run}`, step: "dnf" });
    expect(dnf.map((a) => a.id)).toContain(id);
    const found = await listApplicants({ projectSlug: `t-${run}`, q: `misc-${run}` });
    expect(found).toHaveLength(1);
    expect(await setScore(crypto.randomUUID(), 1)).toEqual({ ok: false, error: "not_found" });
  });

  it("deletes the R2 files, then the row; keeps the row when a file delete fails", async () => {
    const id = await makeApplicant(stageIds["New"], `del-${run}@example.test`);
    await db()
      .update(tables.applicants)
      .set({ videoKey: `test/v-${run}.webm`, thumbKey: `test/t-${run}.jpg`, taskFileKey: `test/f-${run}.pdf` })
      .where(eq(tables.applicants.id, id));
    const removed: string[] = [];
    expect(await deleteApplicant(id, async () => { throw new Error("r2 down"); })).toEqual({ ok: false, error: "files_failed" });
    expect(await getApplicant(id)).not.toBeNull();
    expect(await deleteApplicant(id, async (k) => void removed.push(k))).toEqual({ ok: true });
    expect(removed).toEqual([`test/v-${run}.webm`, `test/t-${run}.jpg`, `test/f-${run}.pdf`]);
    expect(await getApplicant(id)).toBeNull();
    expect(await deleteApplicant(id)).toEqual({ ok: false, error: "not_found" });
  });
});
