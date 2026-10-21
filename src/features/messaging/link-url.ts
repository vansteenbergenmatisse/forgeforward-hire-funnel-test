import type { Channel } from "@/features/projects";

export type LinkInput = {
  channel: Channel;
  phoneE164: string;
  email: string;
  subject?: string;
  body: string;
};

/** The wa.me, sms: or mailto: URL that opens the user's own app with the filled text. */
export function buildLinkUrl(i: LinkInput): string {
  const body = encodeURIComponent(i.body);
  if (i.channel === "whatsapp") return `https://wa.me/${i.phoneE164.replace(/\D/g, "")}?text=${body}`;
  if (i.channel === "sms") return `sms:${i.phoneE164}?&body=${body}`;
  return `mailto:${encodeURIComponent(i.email)}?subject=${encodeURIComponent(i.subject ?? "")}&body=${body}`;
}
