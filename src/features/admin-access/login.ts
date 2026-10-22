import { createHash, createHmac } from "node:crypto";
import { releaseRateLimitHit, tryRecordRateLimitHit } from "@/platform/db";
import { recordSystemError } from "@/platform/logging/system-errors";
import { clientIp } from "@/shared/client-ip";
import { recordAudit } from "./audit";
import { verifyPassword } from "./password";

export const LOGIN_MAX_FAILURES = 8;
export const LOGIN_WINDOW_MS = 15 * 60_000;
export const LOGIN_MAX_PASSWORD_LENGTH = 1024;

export type LoginResult = { ok: true } | { ok: false; reason: "wrong" | "limited" | "disabled" | "unavailable" };

/** The address is stored only as a keyed hash. */
export function loginBucket(ip: string, adminKey: string): string {
  return `admin-login:${createHmac("sha256", adminKey).update(`admin-login-ip-v1|${ip}`).digest("hex").slice(0, 32)}`;
}

/**
 * Checks the password. Every try takes a slot in the 15 minute window first (atomic, in Postgres), so parallel
 * guesses cannot get past the limit. A correct password gives its slot back, so only failures count.
 */
export async function attemptLogin(
  req: Pick<Request, "headers">,
  password: string,
  now: Date = new Date(),
): Promise<LoginResult> {
  const expected = process.env.ADMIN_PASSWORD;
  const adminKey = process.env.ADMIN_KEY;
  if (!expected || expected.length < 1 || !adminKey) return { ok: false, reason: "disabled" };
  const ip = clientIp(req);
  const bucket = loginBucket(ip, adminKey);
  try {
    const since = new Date(now.getTime() - LOGIN_WINDOW_MS);
    if (!(await tryRecordRateLimitHit(bucket, since, LOGIN_MAX_FAILURES, now))) return { ok: false, reason: "limited" };
    if (password.length <= LOGIN_MAX_PASSWORD_LENGTH && verifyPassword(password, expected)) {
      await releaseRateLimitHit(bucket, now);
      await recordAudit({ action: "admin.login", targetType: "admin", detail: { method: "password" } });
      return { ok: true };
    }
    await logFailure(ip);
    return { ok: false, reason: "wrong" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

async function logFailure(ip: string) {
  try {
    // Only a short hash of the address is stored, never the password that was tried.
    const who = createHash("sha256").update(ip).digest("hex").slice(0, 12);
    await recordSystemError({ source: "admin.login", message: "Someone tried a wrong admin password.", data: { ip: who } });
  } catch {
    /* logging must never change the answer */
  }
}
