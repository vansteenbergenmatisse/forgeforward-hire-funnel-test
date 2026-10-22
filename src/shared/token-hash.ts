import { createHash } from "node:crypto";

/**
 * SHA-256 hex of a bearer token. Only this hash is stored, so a database read does not give out a live credential.
 * Migration 0003 backfills with encode(sha256(convert_to(token, 'UTF8')), 'hex'), which is the same value.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
