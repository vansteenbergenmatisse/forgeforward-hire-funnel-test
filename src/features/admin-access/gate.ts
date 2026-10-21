import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "ff_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

function sign(adminKey: string) {
  return createHmac("sha256", adminKey).update("forge-hire-admin-v1").digest("hex");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isValidKey(candidate: string, adminKey: string | undefined): boolean {
  return Boolean(adminKey) && safeEqual(candidate, adminKey as string);
}

/** Cookie value is derived from ADMIN_KEY, so rotating the key logs out every device. */
export function cookieValue(adminKey: string) {
  return sign(adminKey);
}

export function isValidCookie(value: string | undefined, adminKey: string | undefined): boolean {
  return Boolean(value && adminKey) && safeEqual(value as string, sign(adminKey as string));
}
