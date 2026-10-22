import { createHash, timingSafeEqual } from "node:crypto";

/**
 * True when `candidate` equals the configured password. An unset or empty password means password login is off,
 * so nothing matches. Both sides are hashed first, so the comparison takes the same time for any length.
 */
export function verifyPassword(candidate: string, expected: string | undefined): boolean {
  if (!expected || expected.length < 1) return false;
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
