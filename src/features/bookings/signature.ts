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
 * Decides whether a webhook may be processed.
 * Secret unset: reject in production (503, logged by the caller), allow in development and tests.
 */
export function checkWebhookAuth(
  rawBody: string,
  header: string | null,
  secret: string | undefined,
  nodeEnv: string | undefined,
): SecretCheck {
  if (!secret) {
    return nodeEnv === "production"
      ? { ok: false, status: 503, reason: "CALCOM_WEBHOOK_SECRET is not set" }
      : { ok: true };
  }
  return verifyCalcomSignature(rawBody, header, secret) ? { ok: true } : { ok: false, status: 401, reason: "bad signature" };
}
