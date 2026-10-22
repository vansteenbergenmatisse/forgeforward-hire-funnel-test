import { z } from "zod";
import type { BookingEvent } from "@/features/applicants";

const iso = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "bad date");

const body = z.object({
  triggerEvent: z.enum(["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"]),
  createdAt: z.string().optional(),
  payload: z.object({
    uid: z.string().min(1).max(200),
    title: z.string().max(500).optional(),
    startTime: iso,
    endTime: iso,
    attendees: z.array(z.object({ email: z.string().max(320).optional() }).passthrough()).max(50).optional(),
    metadata: z.record(z.string(), z.unknown()).nullish(),
    rescheduleUid: z.string().max(200).nullish(),
    cancellationReason: z.string().max(2000).nullish(),
  }).passthrough(),
});

export type ParsedWebhook =
  | { kind: "booking"; event: BookingEvent; /** When Cal.com sent it (payload createdAt), or null when missing or unreadable. */ sentAt: Date | null }
  | { kind: "ignored"; trigger: string }
  | { kind: "invalid" };

/** Cal.com also sends PING and other triggers. Those are acknowledged and ignored. */
export function parseCalcomWebhook(raw: unknown): ParsedWebhook {
  const trigger = (raw as { triggerEvent?: unknown } | null)?.triggerEvent;
  if (typeof trigger !== "string") return { kind: "invalid" };
  if (!["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"].includes(trigger)) {
    return { kind: "ignored", trigger };
  }
  const r = body.safeParse(raw);
  if (!r.success) return { kind: "invalid" };
  const p = r.data.payload;
  const meta = p.metadata ?? {};
  const rawApplicantId = meta["applicant_id"];
  const email = p.attendees?.find((a) => a.email)?.email?.trim().toLowerCase() ?? null;
  const sent = r.data.createdAt ? new Date(r.data.createdAt) : null;
  return {
    kind: "booking",
    sentAt: sent && !Number.isNaN(sent.getTime()) ? sent : null,
    event: {
      trigger: r.data.triggerEvent,
      uid: p.uid,
      title: p.title ?? "Booking",
      start: new Date(p.startTime).toISOString(),
      end: new Date(p.endTime).toISOString(),
      attendeeEmail: email,
      applicantId: typeof rawApplicantId === "string" ? rawApplicantId : null,
      rescheduleUid: p.rescheduleUid ?? null,
      cancellationReason: p.cancellationReason ?? null,
    },
  };
}
