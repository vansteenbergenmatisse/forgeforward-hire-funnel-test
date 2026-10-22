import { describe, expect, it } from "vitest";
import { bookingTargetStage, isLockedStageName, nextBooking, type BookingEvent, type StageLite } from "./booking-rules";

const stages: StageLite[] = [
  { id: "new", name: "New", role: "entry_new", isFinal: false },
  { id: "booked", name: "Interview booked", role: "on_booking", isFinal: false },
  { id: "hired", name: "Hired", role: null, isFinal: true },
  { id: "rej", name: "Rejected", role: null, isFinal: true },
  { id: "trial", name: "Trial", role: null, isFinal: false },
];
const by = (id: string) => stages.find((s) => s.id === id) ?? null;

const ev = (trigger: BookingEvent["trigger"], uid = "u1"): BookingEvent => ({
  trigger,
  uid,
  title: "Interview",
  start: "2026-10-22T14:00:00.000Z",
  end: "2026-10-22T14:30:00.000Z",
  attendeeEmail: "a@b.co",
  applicantId: null,
  rescheduleUid: null,
  cancellationReason: null,
});

describe("bookingTargetStage", () => {
  it("moves a new card to the on_booking stage", () => {
    expect(bookingTargetStage("BOOKING_CREATED", by("new"), stages)?.id).toBe("booked");
  });
  it("moves a Did not finish card (no stage) too", () => {
    expect(bookingTargetStage("BOOKING_CREATED", null, stages)?.id).toBe("booked");
  });
  it("moves a card out of a middle stage", () => {
    expect(bookingTargetStage("BOOKING_CREATED", by("trial"), stages)?.id).toBe("booked");
  });
  it("never moves Hired or Rejected", () => {
    expect(bookingTargetStage("BOOKING_CREATED", by("hired"), stages)).toBeNull();
    expect(bookingTargetStage("BOOKING_CREATED", by("rej"), stages)).toBeNull();
  });
  it("does nothing when already on the booking stage", () => {
    expect(bookingTargetStage("BOOKING_CREATED", by("booked"), stages)).toBeNull();
  });
  it("reschedule and cancel keep the card in place", () => {
    expect(bookingTargetStage("BOOKING_RESCHEDULED", by("new"), stages)).toBeNull();
    expect(bookingTargetStage("BOOKING_CANCELLED", by("new"), stages)).toBeNull();
  });
  it("does nothing when the project has no on_booking stage", () => {
    expect(bookingTargetStage("BOOKING_CREATED", by("new"), stages.filter((s) => s.role !== "on_booking"))).toBeNull();
  });
  it("locks stages flagged final", () => {
    expect(isLockedStageName({ isFinal: true })).toBe(true);
    expect(isLockedStageName({ isFinal: false })).toBe(false);
  });
});

describe("nextBooking", () => {
  it("creates a booked booking", () => {
    expect(nextBooking(null, ev("BOOKING_CREATED"))?.status).toBe("booked");
  });
  it("marks a reschedule with the new uid", () => {
    const n = nextBooking({ uid: "u1", start: "x", end: "y", status: "booked" }, ev("BOOKING_RESCHEDULED", "u2"));
    expect(n).toMatchObject({ uid: "u2", status: "rescheduled" });
  });
  it("cancels the matching booking", () => {
    expect(nextBooking({ uid: "u1", start: "x", end: "y", status: "booked" }, ev("BOOKING_CANCELLED", "u1"))?.status).toBe("cancelled");
  });
  it("ignores a cancel for an old uid", () => {
    expect(nextBooking({ uid: "u2", start: "x", end: "y", status: "rescheduled" }, ev("BOOKING_CANCELLED", "u1"))).toBeNull();
  });
});
