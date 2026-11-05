import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { withPrefix } from "@/platform/r2";

// A "shadow" session is what an applicant gets when their phone number already finished this project's application.
// They walk through every step and see the thank you page, but nothing about them is saved. The session is a signed
// token with no database row behind it, so a later step recognises it by the signature alone.

const PREFIX = "shadow.";
const INFO = "funnel-shadow-session-v1";

let ephemeral: string | undefined;

/** HMAC key derived from ADMIN_KEY with its own HKDF label. Without ADMIN_KEY (dev only) a per-process key is used. */
function derive(adminKey: string | undefined): Buffer {
  const secret = adminKey || (ephemeral ??= randomBytes(32).toString("hex"));
  return Buffer.from(hkdfSync("sha256", secret, "", INFO, 32));
}

const sign = (payload: string, adminKey: string | undefined) => createHmac("sha256", derive(adminKey)).update(payload).digest("base64url");

export type ShadowKind = "resume" | "handoff";
export type Shadow = { slug: string; nonce: string };

/** `shadow.<base64url(kind|slug|expiry|nonce)>.<signature>`. A resume token never expires, like a real one. A handoff token does. */
export function makeShadowToken(kind: ShadowKind, slug: string, ttlMs?: number, adminKey = process.env.ADMIN_KEY, now = Date.now()): string {
  const expires = ttlMs ? now + ttlMs : 0;
  const payload = Buffer.from(`${kind}|${slug}|${expires}|${randomBytes(9).toString("base64url")}`).toString("base64url");
  return `${PREFIX}${payload}.${sign(payload, adminKey)}`;
}

/** The shadow session behind a token, or null when it is not one, is the other kind, was changed, or has expired. */
export function readShadowToken(token: unknown, kind: ShadowKind, adminKey = process.env.ADMIN_KEY, now = Date.now()): Shadow | null {
  if (typeof token !== "string" || !token.startsWith(PREFIX)) return null;
  const parts = token.slice(PREFIX.length).split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const want = Buffer.from(sign(payload, adminKey));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const [k, slug, expires, nonce] = Buffer.from(payload, "base64url").toString().split("|");
  if (k !== kind || !slug || !nonce) return null;
  if (Number(expires) > 0 && Number(expires) < now) return null;
  return { slug, nonce };
}

/** Where a shadow session's uploads go in R2. Each session has its own folder, and the server deletes what lands there. */
export function shadowKeyDir(kind: "videos" | "thumbs" | "tasks", shadow: Shadow): string {
  return withPrefix(`shadow/${kind}/${shadow.slug}/${shadow.nonce}/`);
}
