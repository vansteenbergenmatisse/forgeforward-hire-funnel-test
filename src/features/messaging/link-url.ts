import type { Channel } from "@/features/projects";

export type LinkInput = {
  channel: Channel;
  phoneE164: string;
  email: string;
  subject?: string;
  body: string;
};

const E164 = /^\+[1-9]\d{6,14}$/;

export class InvalidContactError extends Error {
  constructor() {
    super("This phone number is not valid.");
    this.name = "InvalidContactError";
  }
}

/** The wa.me, sms: or mailto: URL that opens the user's own app with the filled text. */
export function buildLinkUrl(i: LinkInput): string {
  const body = encodeURIComponent(i.body);
  // The number is checked again here so a bad stored value can never inject anything into the sms: or wa.me URL.
  if (i.channel !== "email" && !E164.test(i.phoneE164)) throw new InvalidContactError();
  if (i.channel === "whatsapp") return `https://wa.me/${i.phoneE164.replace(/\D/g, "")}?text=${body}`;
  if (i.channel === "sms") return `sms:${i.phoneE164}?&body=${body}`;
  return `mailto:${encodeURIComponent(i.email)}?subject=${encodeURIComponent(i.subject ?? "")}&body=${body}`;
}
