import { optionalEnv } from "@/shared/env";

const GRAPH = "https://graph.facebook.com/v21.0";

export type WhatsAppResult = { ok: true; providerMessageId: string } | { ok: false; error: string };

export function whatsappConfigured(): boolean {
  return Boolean(optionalEnv("WA_PHONE_NUMBER_ID") && optionalEnv("WA_ACCESS_TOKEN"));
}

async function post(payload: Record<string, unknown>): Promise<WhatsAppResult> {
  const id = optionalEnv("WA_PHONE_NUMBER_ID");
  const token = optionalEnv("WA_ACCESS_TOKEN");
  if (!id || !token) return { ok: false, error: "WhatsApp is not configured." };
  try {
    const res = await fetch(`${GRAPH}/${id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    const mid = json.messages?.[0]?.id;
    if (!res.ok || !mid) return { ok: false, error: json.error?.message ?? `WhatsApp error ${res.status}` };
    return { ok: true, providerMessageId: mid };
  } catch {
    return { ok: false, error: "Could not reach WhatsApp." };
  }
}

const digits = (e164: string) => e164.replace(/\D/g, "");

/** Approved template send. `variables` are the ordered body parameters ({{1}}, {{2}}, ...). */
export function sendWhatsAppTemplate(i: { to: string; name: string; language: string; variables: string[] }) {
  return post({
    to: digits(i.to),
    type: "template",
    template: {
      name: i.name,
      language: { code: i.language },
      components: i.variables.length
        ? [{ type: "body", parameters: i.variables.map((text) => ({ type: "text", text })) }]
        : [],
    },
  });
}

/** Free text. Only works inside the 24 hour window after the applicant's last reply. */
export function sendWhatsAppText(i: { to: string; body: string }) {
  return post({ to: digits(i.to), type: "text", text: { body: i.body, preview_url: true } });
}
