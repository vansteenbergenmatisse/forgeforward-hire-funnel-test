import type { TimelineEvent } from "@/features/applicants";
import { formatDuration } from "./format";

const CHANNEL: Record<string, string> = { whatsapp: "WhatsApp", sms: "SMS", email: "Email" };

/** Friendly timeline text for one event. `stageName` resolves a stage id from the project's stages. */
export function eventText(e: TimelineEvent, stageName: (id: string | null) => string): string {
  const d = e.data ?? {};
  const channel = typeof d.channel === "string" ? (CHANNEL[d.channel] ?? d.channel) : "";
  switch (e.type) {
    case "form_submitted":
      return "Form submitted";
    case "video_saved":
      return typeof d.seconds === "number" ? `Video saved (${formatDuration(d.seconds)})` : "Video saved";
    case "task_submitted":
      return "Task submitted";
    case "task_skipped":
      return "Task skipped";
    case "application_completed":
      return "Application completed";
    case "stage_changed": {
      const from = typeof d.from === "string" ? d.from : null;
      const to = typeof d.to === "string" ? d.to : null;
      return from ? `Stage changed: ${stageName(from)} to ${stageName(to)}` : `Added to ${stageName(to)}`;
    }
    case "booking_created":
      return "Interview booked";
    case "booking_rescheduled":
      return "Interview rescheduled";
    case "booking_cancelled":
      return "Booking cancelled";
    case "message_sent":
      return channel ? `${channel} message sent` : "Message sent";
    case "message_received":
      return channel ? `${channel} reply received` : "Reply received";
    case "media_deleted":
      return "Video deleted";
    case "handoff_used":
      return "Phone handoff used";
    default:
      return e.type.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  }
}

/** Newest first. Does not mutate. */
export function newestFirst(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
