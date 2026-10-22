import { createHmac, timingSafeEqual } from "node:crypto";

export const CALCOM_SIGNATURE_HEADER = "x-cal-signature-256";

/** Cal.com signs the raw body: hex HMAC-SHA256 with the webhook secret, in x-cal-signature-256. */
export function signCalcomBody(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyCalcomSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(signCalcomBody(rawBody, secret));
  const given = Buffer.from(header.trim().toLowerCase());
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export type SecretCheck = { ok: true } | { ok: false; status: 401 | 503; reason: string };

/**
 * Decides whether a webhook may be processed. Fails closed in every environment: without a secret nothing is accepted
 * (503), and a missing or wrong signature is 401. `reason` is for the server log only, never for the response body.
 * `nodeEnv` is kept for callers that pass it; it no longer changes the result.
 */
export function checkWebhookAuth(
  rawBody: string,
  header: string | null,
  secret: string | undefined,
  nodeEnv?: string | undefined,
): SecretCheck {
  void nodeEnv;
  if (!secret) return { ok: false, status: 503, reason: "CALCOM_WEBHOOK_SECRET is not set" };
  return verifyCalcomSignature(rawBody, header, secret) ? { ok: true } : { ok: false, status: 401, reason: "bad signature" };
}
