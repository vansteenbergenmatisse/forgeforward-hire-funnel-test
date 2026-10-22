import { createHmac, timingSafeEqual } from "node:crypto";

/** Checks X-Hub-Signature-256 ("sha256=<hex>") against the raw request body. */
export function verifySignature(rawBody: string, header: string | null, appSecret: string | undefined): boolean {
  if (!header || !appSecret || !header.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", appSecret).update(rawBody).digest("hex"));
  const given = Buffer.from(header.slice(7));
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** GET handshake. Returns the challenge to echo, or null when the request is not valid. */
export function verifyHandshake(params: URLSearchParams, verifyToken: string | undefined): string | null {
  if (!verifyToken || params.get("hub.mode") !== "subscribe") return null;
  const given = Buffer.from(params.get("hub.verify_token") ?? "");
  const want = Buffer.from(verifyToken);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  return params.get("hub.challenge");
}
