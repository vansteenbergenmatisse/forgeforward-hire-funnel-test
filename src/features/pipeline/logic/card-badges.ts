import type { StageDef } from "@/features/projects";
import { retentionBadgeText, videoDeletesInDays, type ApplicantView } from "@/features/applicants";
import type { Tone } from "@/components/ui";

export type CardBadge = { key: string; tone: Tone; text: string };

/** "Thu 10:00 AM" in the given zone (the viewer's zone when omitted). */
export function bookingLabel(startIso: string, timeZone?: string): string {
  const d = new Date(startIso);
  const opts = timeZone ? { timeZone } : {};
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", ...opts }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, ...opts }).format(d);
  return `${day} ${time}`;
}

/** Badges in card order: Did task, Audio only, Applied before, booking, retention. */
export function cardBadges(a: ApplicantView, stages: StageDef[], now: Date, timeZone?: string): CardBadge[] {
  const out: CardBadge[] = [];
  if (a.didTask) out.push({ key: "task", tone: "blue", text: "Did task" });
  if (a.audioOnly) out.push({ key: "audio", tone: "gray", text: "Audio only" });
  if (a.appliedBefore) out.push({ key: "before", tone: "purple", text: "Applied before" });
  if (a.booking?.status === "cancelled") out.push({ key: "booking", tone: "red", text: "Cancelled" });
  else if (a.booking) out.push({ key: "booking", tone: "amber", text: `Booked ${bookingLabel(a.booking.start, timeZone)}` });
  if (a.media?.deletedAt) out.push({ key: "retention", tone: "gray", text: "Video deleted" });
  else {
    const days = videoDeletesInDays(a, stages, now);
    if (days !== null) out.push({ key: "retention", tone: "red", text: retentionBadgeText(days) });
  }
  return out;
}
