import type { tables } from "@/platform/db";
import type { ApplicantView, MessageRow, TimelineEvent } from "../types";

type ApplicantRow = typeof tables.applicants.$inferSelect;
type EventRow = typeof tables.applicantEvents.$inferSelect;
type MessageDbRow = typeof tables.messages.$inferSelect;

const iso = (d: Date) => d.toISOString();

/** Route that redirects to a short-lived signed R2 URL. Same origin, so the admin cookie applies. */
export function mediaPath(applicantId: string, kind: "video" | "thumb" | "task"): string {
  return `/api/admin/applicants/${applicantId}/media?kind=${kind}`;
}

function fileName(key: string): string {
  return key.split("/").pop() ?? key;
}

export function toEventView(e: EventRow): TimelineEvent {
  const base = { id: e.id, type: e.type, at: iso(e.createdAt) };
  return Object.keys(e.data ?? {}).length > 0 ? { ...base, data: e.data } : base;
}

export function toMessageView(m: MessageDbRow): MessageRow {
  return {
    id: m.id,
    channel: m.channel,
    direction: m.direction,
    mode: m.mode,
    body: m.body,
    status: m.status,
    at: iso(m.createdAt),
  };
}

/** DB row to the front-end view model. Pure, so it is unit tested without a database. */
export function toApplicantView(
  row: ApplicantRow,
  projectSlug: string,
  events: EventRow[],
  messages: MessageDbRow[],
): ApplicantView {
  const booking = row.booking;
  const status = booking?.status === "cancelled" || booking?.status === "rescheduled" ? booking.status : "booked";
  return {
    id: row.id,
    projectSlug,
    stageId: row.stageId,
    isTest: row.isTest,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phoneE164: row.phoneE164,
    phoneCountry: row.phoneCountry ?? "",
    whatsappOk: row.whatsappOk,
    timezone: row.timezone,
    answers: row.answers,
    funnelStep: row.funnelStep,
    createdAt: iso(row.createdAt),
    completedAt: row.completedAt ? iso(row.completedAt) : null,
    media: row.videoKey
      ? {
          kind: row.audioOnly ? "audio" : "video",
          src: mediaPath(row.id, "video"),
          seconds: row.videoSeconds ?? 0,
          bytes: row.videoBytes ?? 0,
          deletedAt: row.videoDeletedAt ? iso(row.videoDeletedAt) : null,
        }
      : null,
    audioOnly: row.audioOnly,
    retakeUsed: row.retakeUsed,
    didTask: row.didTask,
    taskText: row.taskText,
    taskLink: row.taskLink,
    // Rows from before the size columns existed have no name or size. Fall back to the key and 0.
    taskFile: row.taskFileKey
      ? { name: row.taskFileName ?? fileName(row.taskFileKey), url: mediaPath(row.id, "task"), bytes: row.taskFileBytes ?? 0 }
      : null,
    score: row.score,
    notes: row.notes,
    appliedBefore: row.appliedBefore,
    booking: booking ? { start: booking.start, end: booking.end, status } : null,
    unreadReply: row.unreadReply,
    lastStageChangeAt: row.lastStageChangeAt ? iso(row.lastStageChangeAt) : null,
    events: events.map(toEventView).sort((a, b) => a.at.localeCompare(b.at)),
    messages: messages.map(toMessageView).sort((a, b) => a.at.localeCompare(b.at)),
  };
}
