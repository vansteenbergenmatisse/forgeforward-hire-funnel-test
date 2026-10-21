import type { MessageRow } from "@/features/applicants";

const LABEL: Record<MessageRow["status"], string> = {
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
  opened_link: "Opened in app",
  received: "New",
};

export function statusLabel(m: Pick<MessageRow, "status" | "direction">): string {
  return m.direction === "in" ? "Reply" : LABEL[m.status];
}

export const CHANNEL_LABEL = { whatsapp: "WhatsApp", sms: "SMS", email: "Email" } as const;
