// Pure Cal.com booking rules shared by the webhook and "Link booking". No database here.

export type BookingTrigger = "BOOKING_CREATED" | "BOOKING_RESCHEDULED" | "BOOKING_CANCELLED";

/** Cal.com booking event, reduced to the fields we use. Also the shape stored in unmatched_bookings.payload. */
export type BookingEvent = {
  trigger: BookingTrigger;
  uid: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  attendeeEmail: string | null;
  applicantId: string | null; // metadata.applicant_id
  rescheduleUid: string | null;
  cancellationReason: string | null;
};

export type StageLite = { id: string; name: string; role: string | null; isFinal: boolean };

/** Final stages (Hired, Rejected) carry `is_final`. A booking never pulls a card out of them. */
export function isLockedStageName(stage: Pick<StageLite, "isFinal">): boolean {
  return stage.isFinal;
}

/**
 * Stage a booking should move the card to, or `null` to leave it where it is.
 * Only BOOKING_CREATED moves cards. Reschedule and cancel keep the card in place.
 */
export function bookingTargetStage(
  trigger: BookingTrigger,
  current: StageLite | null,
  stages: StageLite[],
): StageLite | null {
  if (trigger !== "BOOKING_CREATED") return null;
  const target = stages.find((s) => s.role === "on_booking");
  if (!target) return null;
  if (current && (current.id === target.id || isLockedStageName(current))) return null;
  return target;
}

export type StoredBooking = { uid: string; start: string; end: string; status: string } | null;

/**
 * Next stored booking for a webhook event, or `null` when the event must be ignored.
 * A cancel for an old uid (after a reschedule gave the booking a new uid) is ignored.
 */
export function nextBooking(current: StoredBooking, ev: BookingEvent): NonNullable<StoredBooking> | null {
  if (ev.trigger === "BOOKING_CANCELLED") {
    if (current && current.uid !== ev.uid) return null;
    return { uid: ev.uid, start: ev.start, end: ev.end, status: "cancelled" };
  }
  return {
    uid: ev.uid,
    start: ev.start,
    end: ev.end,
    status: ev.trigger === "BOOKING_RESCHEDULED" ? "rescheduled" : "booked",
  };
}

export const BOOKING_EVENT_TYPE: Record<BookingTrigger, string> = {
  BOOKING_CREATED: "booking_created",
  BOOKING_RESCHEDULED: "booking_rescheduled",
  BOOKING_CANCELLED: "booking_cancelled",
};
