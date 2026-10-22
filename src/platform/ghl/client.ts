import { optionalEnv } from "@/shared/env";

// GoHighLevel API v2. Checked against the current docs: POST /contacts/upsert, then
// POST /conversations/messages with type SMS. Header "Version" is "v3" (older: 2021-07-28).
const BASE = "https://services.leadconnectorhq.com";

export type GhlResult = { ok: true; providerMessageId: string } | { ok: false; error: string };

export function ghlConfigured(): boolean {
  return Boolean(optionalEnv("GHL_PRIVATE_TOKEN") && optionalEnv("GHL_LOCATION_ID"));
}

async function call<T>(path: string, token: string, body: Record<string, unknown>): Promise<{ ok: true; json: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: optionalEnv("GHL_API_VERSION") ?? "v3",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as T & { message?: string | string[] };
    if (!res.ok) {
      const m = (json as { message?: string | string[] }).message;
      return { ok: false, error: (Array.isArray(m) ? m.join(", ") : m) ?? `GoHighLevel error ${res.status}` };
    }
    return { ok: true, json };
  } catch {
    return { ok: false, error: "Could not reach GoHighLevel." };
  }
}

/** Upserts the contact by phone, then sends the SMS. Never throws. */
export async function sendGhlSms(i: { phoneE164: string; firstName: string; lastName: string; email?: string; body: string }): Promise<GhlResult> {
  const token = optionalEnv("GHL_PRIVATE_TOKEN");
  const locationId = optionalEnv("GHL_LOCATION_ID");
  if (!token || !locationId) return { ok: false, error: "SMS is not configured." };

  const contact = await call<{ contact?: { id?: string } }>("/contacts/upsert", token, {
    locationId,
    phone: i.phoneE164,
    firstName: i.firstName,
    lastName: i.lastName,
    ...(i.email ? { email: i.email } : {}),
  });
  if (!contact.ok) return contact;
  const contactId = contact.json.contact?.id;
  if (!contactId) return { ok: false, error: "GoHighLevel returned no contact id." };

  const sent = await call<{ messageId?: string; messageIds?: string[] }>("/conversations/messages", token, {
    type: "SMS",
    contactId,
    message: i.body,
  });
  if (!sent.ok) return sent;
  const id = sent.json.messageId ?? sent.json.messageIds?.[0];
  return id ? { ok: true, providerMessageId: id } : { ok: false, error: "GoHighLevel returned no message id." };
}
