import { and, desc, eq, sql } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import {
  BOOKING_EVENT_TYPE,
  bookingTargetStage,
  nextBooking,
  type BookingEvent,
  type StageLite,
} from "../booking-rules";
import type { UnmatchedBookingView } from "../types";

const { applicants, applicantEvents, stages, unmatchedBookings } = tables;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Finds the applicant a booking belongs to: metadata.applicant_id, then the previous booking uid
 * (reschedules), then attendee email (newest match). `null` means "unmatched".
 */
export async function findApplicantForBooking(ev: BookingEvent): Promise<string | null> {
  if (ev.applicantId && UUID.test(ev.applicantId)) {
    const [r] = await db().select({ id: applicants.id }).from(applicants).where(eq(applicants.id, ev.applicantId)).limit(1);
    if (r) return r.id;
  }
  const uids = [ev.uid, ev.rescheduleUid].filter((u): u is string => Boolean(u));
  for (const uid of uids) {
    const [r] = await db()
      .select({ id: applicants.id })
      .from(applicants)
      .where(sql`${applicants.booking}->>'uid' = ${uid}`)
      .limit(1);
    if (r) return r.id;
  }
  if (ev.attendeeEmail) {
    const rows = await db()
      .select({ id: applicants.id, projectId: applicants.projectId })
      .from(applicants)
      .where(sql`lower(${applicants.email}) = ${ev.attendeeEmail.toLowerCase()}`)
      .orderBy(desc(applicants.createdAt))
      .limit(50);
    return pickByEmail(rows);
  }
  return null;
}

/**
 * Email match for a booking without a usable applicant id. Rows are newest first. When the same email applied to more
 * than one project we cannot tell which role the booking is for, so it stays unmatched for a person to link.
 */
export function pickByEmail(rows: { id: string; projectId: string }[]): string | null {
  if (rows.length === 0) return null;
  return new Set(rows.map((r) => r.projectId)).size === 1 ? rows[0].id : null;
}

export type ApplyResult = { applied: boolean; movedTo: string | null };

/** Saves the booking on the applicant, moves the card when the rules say so, and writes the timeline events. */
export async function applyBookingEvent(applicantId: string, ev: BookingEvent, now: Date = new Date()): Promise<ApplyResult> {
  return db().transaction(async (tx) => {
    const [row] = await tx.select().from(applicants).where(eq(applicants.id, applicantId)).limit(1);
    if (!row) return { applied: false, movedTo: null };
    const booking = nextBooking(row.booking, ev);
    if (!booking) return { applied: false, movedTo: null };

    const projectStages: StageLite[] = await tx
      .select({ id: stages.id, name: stages.name, role: stages.role, isFinal: stages.isFinal })
      .from(stages)
      .where(eq(stages.projectId, row.projectId));
    const current = projectStages.find((s) => s.id === row.stageId) ?? null;
    const target = bookingTargetStage(ev.trigger, current, projectStages);

    await tx
      .update(applicants)
      .set({ booking, ...(target ? { stageId: target.id, lastStageChangeAt: now } : {}) })
      .where(eq(applicants.id, applicantId));
    const events: (typeof applicantEvents.$inferInsert)[] = [
      {
        applicantId,
        type: BOOKING_EVENT_TYPE[ev.trigger],
        data: { uid: ev.uid, start: ev.start, end: ev.end, ...(ev.cancellationReason ? { reason: ev.cancellationReason } : {}) },
        createdAt: now,
      },
    ];
    if (target) {
      events.push({
        applicantId,
        type: "stage_changed",
        data: { from: row.stageId, to: target.id, reason: "booking" },
        createdAt: new Date(now.getTime() + 1),
      });
    }
    await tx.insert(applicantEvents).values(events);
    return { applied: true, movedTo: target?.id ?? null };
  });
}

export async function saveUnmatchedBooking(ev: BookingEvent): Promise<string> {
  const [r] = await db()
    .insert(unmatchedBookings)
    .values({ payload: ev, attendeeEmail: ev.attendeeEmail })
    .returning({ id: unmatchedBookings.id });
  return r.id;
}

type Stored = Partial<BookingEvent> & { linkedApplicantId?: string; dismissed?: boolean };

const WHEN = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

export function toUnmatchedView(row: typeof unmatchedBookings.$inferSelect): UnmatchedBookingView {
  const p = (row.payload ?? {}) as Stored;
  const start = p.start ?? row.createdAt.toISOString();
  return {
    id: row.id,
    email: row.attendeeEmail ?? "Unknown email",
    title: p.title ?? "Booking",
    start,
    when: WHEN.format(new Date(start)),
    ...(p.linkedApplicantId ? { linkedApplicantId: p.linkedApplicantId } : {}),
    ...(p.dismissed ? { dismissed: true } : {}),
  };
}

/** Open bookings first, newest first. Linked and dismissed rows stay for the box's history. */
export async function listUnmatchedBookings(): Promise<UnmatchedBookingView[]> {
  const rows = await db().select().from(unmatchedBookings).orderBy(desc(unmatchedBookings.createdAt)).limit(200);
  return rows.map(toUnmatchedView);
}

export async function dismissUnmatchedBooking(id: string): Promise<boolean> {
  const rows = await db()
    .update(unmatchedBookings)
    .set({ resolved: true, payload: sql`${unmatchedBookings.payload} || '{"dismissed": true}'::jsonb` })
    .where(and(eq(unmatchedBookings.id, id), eq(unmatchedBookings.resolved, false)))
    .returning({ id: unmatchedBookings.id });
  return rows.length > 0;
}

export type LinkResult = { ok: true } | { ok: false; error: "not_found" | "applicant_not_found" | "already_resolved" };

/** Applies a stored unmatched booking to an applicant, then marks it resolved. */
export async function linkUnmatchedBooking(id: string, applicantId: string, now: Date = new Date()): Promise<LinkResult> {
  const [row] = await db().select().from(unmatchedBookings).where(eq(unmatchedBookings.id, id)).limit(1);
  if (!row) return { ok: false, error: "not_found" };
  if (row.resolved) return { ok: false, error: "already_resolved" };
  const [target] = await db().select({ id: applicants.id }).from(applicants).where(eq(applicants.id, applicantId)).limit(1);
  if (!target) return { ok: false, error: "applicant_not_found" };
  const ev = row.payload as BookingEvent;
  await applyBookingEvent(applicantId, ev, now);
  await db()
    .update(unmatchedBookings)
    .set({ resolved: true, payload: sql`${unmatchedBookings.payload} || ${JSON.stringify({ linkedApplicantId: applicantId })}::jsonb` })
    .where(eq(unmatchedBookings.id, id));
  return { ok: true };
}
