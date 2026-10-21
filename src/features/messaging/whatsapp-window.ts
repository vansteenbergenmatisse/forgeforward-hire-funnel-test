export const WHATSAPP_WINDOW_HOURS = 24;

type Msg = { channel: string; direction: "out" | "in"; at: string };

export type WhatsAppWindow = { open: false } | { open: true; hoursLeft: number; lastReplyAt: string };

/** Free text works for 24 hours after the applicant's last WhatsApp message. */
export function whatsappWindow(messages: Msg[], now: Date): WhatsAppWindow {
  const inbound = messages.filter((m) => m.channel === "whatsapp" && m.direction === "in");
  if (inbound.length === 0) return { open: false };
  const last = inbound.reduce((a, b) => (new Date(a.at) > new Date(b.at) ? a : b));
  const elapsed = (now.getTime() - new Date(last.at).getTime()) / 3_600_000;
  const left = WHATSAPP_WINDOW_HOURS - elapsed;
  if (left <= 0) return { open: false };
  return { open: true, hoursLeft: Math.max(1, Math.ceil(left)), lastReplyAt: last.at };
}

export function whatsappWindowText(w: WhatsAppWindow): string {
  if (!w.open) return "The 24 hour window is closed. Only approved templates send.";
  const h = w.hoursLeft === 1 ? "1 more hour" : `${w.hoursLeft} more hours`;
  return `Free text is open for ${h}. After that only approved templates send.`;
}
