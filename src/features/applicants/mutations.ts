import type { ApplicantView, LinkableBooking, MessageRow, TimelineEvent } from "./types";

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}-${counter}`;
}

export function makeEvent(type: string, data?: Record<string, unknown>, at: Date = new Date()): TimelineEvent {
  return data ? { id: uid("ev"), type, at: at.toISOString(), data } : { id: uid("ev"), type, at: at.toISOString() };
}

export function patchApplicant(a: ApplicantView, patch: Partial<ApplicantView>): ApplicantView {
  return { ...a, ...patch };
}

/** Moves a card, records stage_changed (from, to) and the time of the move. No-op for the same stage. */
export function applyMove(a: ApplicantView, stageId: string, now: Date = new Date()): ApplicantView {
  if (a.stageId === stageId) return a;
  return {
    ...a,
    stageId,
    lastStageChangeAt: now.toISOString(),
    events: [...a.events, makeEvent("stage_changed", { from: a.stageId, to: stageId }, now)],
  };
}

/** Puts a "Did not finish" card on the board. funnelStep stays as it was. */
export function applyPlace(a: ApplicantView, stageId: string, now: Date = new Date()): ApplicantView {
  return applyMove(a, stageId, now);
}

export function applyMessage(
  a: ApplicantView,
  message: Omit<MessageRow, "id" | "at"> & { at?: string },
  now: Date = new Date(),
): ApplicantView {
  const at = message.at ?? now.toISOString();
  const row: MessageRow = { ...message, id: uid("msg"), at };
  const type = message.direction === "out" ? "message_sent" : "message_received";
  return {
    ...a,
    messages: [...a.messages, row],
    unreadReply: message.direction === "in" ? true : a.unreadReply,
    events: [...a.events, makeEvent(type, { channel: message.channel, mode: message.mode, messageId: row.id }, new Date(at))],
  };
}

/** Mock-mode link: saves the booking and adds the timeline event. The server also moves the card (see booking-rules). */
export function applyBookingLink(a: ApplicantView, b: LinkableBooking, now: Date = new Date()): ApplicantView {
  const end = b.end ?? new Date(Date.parse(b.start) + 30 * 60_000).toISOString();
  return {
    ...a,
    booking: { start: b.start, end, status: "booked" },
    events: [...a.events, makeEvent("booking_created", { start: b.start, end, linked: true }, now)],
  };
}
