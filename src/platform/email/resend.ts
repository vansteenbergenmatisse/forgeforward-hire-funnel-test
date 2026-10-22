import { optionalEnv } from "@/shared/env";
import { renderEmailHtml } from "./html";

export type EmailInput = { to: string; subject: string; text: string };
export type EmailResult = { ok: true; providerMessageId: string } | { ok: false; error: string };

/** Resend needs an API key and a verified sender. Without both, email runs in link mode. */
export function emailConfigured(): boolean {
  return Boolean(optionalEnv("RESEND_API_KEY") && optionalEnv("EMAIL_FROM"));
}

/** Sends one email through the Resend REST API. Never throws. */
export async function sendEmail(i: EmailInput): Promise<EmailResult> {
  const key = optionalEnv("RESEND_API_KEY");
  const from = optionalEnv("EMAIL_FROM");
  if (!key || !from) return { ok: false, error: "Email is not configured." };
  const replyTo = optionalEnv("EMAIL_REPLY_TO");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [i.to],
        subject: i.subject,
        text: i.text,
        html: renderEmailHtml(i.text),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !json.id) return { ok: false, error: json.message ?? `Resend error ${res.status}` };
    return { ok: true, providerMessageId: json.id };
  } catch {
    return { ok: false, error: "Could not reach Resend." };
  }
}
