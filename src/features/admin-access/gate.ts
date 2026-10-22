import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Production uses the __Host- prefix: the browser then only accepts it over https, for this host, with Path=/ and no Domain. */
export const ADMIN_COOKIE = process.env.NODE_ENV === "production" ? "__Host-ff_admin" : "ff_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function sign(adminKey: string, payload: string) {
  return createHmac("sha256", adminKey).update(`forge-hire-admin-v2|${payload}`).digest("hex");
}

function safeEqual(a: string, b: string) {
  // Hash first so the comparison does not depend on the length of either side.
  const ah = createHash("sha256").update(a).digest();
  const bh = createHash("sha256").update(b).digest();
  return timingSafeEqual(ah, bh);
}

export function isValidKey(candidate: string, adminKey: string | undefined): boolean {
  return Boolean(adminKey) && safeEqual(candidate, adminKey as string);
}

/**
 * One cookie per login: `<expires>.<random id>.<signature>`. The expiry is signed, so a copied cookie stops working on
 * its own and every login gets a different value. Rotating ADMIN_KEY still logs out every device.
 */
export function cookieValue(adminKey: string, now: Date = new Date()): string {
  const exp = Math.floor(now.getTime() / 1000) + ADMIN_COOKIE_MAX_AGE;
  const id = randomBytes(12).toString("hex");
  const payload = `${exp}.${id}`;
  return `${payload}.${sign(adminKey, payload)}`;
}

export function isValidCookie(value: string | undefined, adminKey: string | undefined, now: Date = new Date()): boolean {
  if (!value || !adminKey) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [exp, id, sig] = parts;
  if (!/^\d{1,12}$/.test(exp) || !/^[0-9a-f]{24}$/.test(id)) return false;
  if (Number(exp) * 1000 <= now.getTime()) return false;
  return safeEqual(sig, sign(adminKey, `${exp}.${id}`));
}

/** Flags of the admin cookie. The key link and the password login both set it with these. */
export function adminCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  };
}
