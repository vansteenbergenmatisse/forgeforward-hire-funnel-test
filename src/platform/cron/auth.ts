import { timingSafeEqual } from "node:crypto";

/** True when the header is exactly `Bearer <secret>`. Constant-time compare. Never true without a secret. */
export function isValidCronAuth(header: string | null | undefined, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  if (given.length !== expected.length) {
    // Compare against itself so timing does not depend on where the length differs.
    timingSafeEqual(expected, expected);
    return false;
  }
  return timingSafeEqual(given, expected);
}

/** Returns a 401 Response when the request is not a valid cron call, otherwise null. */
export function rejectUnlessCron(req: Request): Response | null {
  if (isValidCronAuth(req.headers.get("authorization"), process.env.CRON_SECRET)) return null;
  return new Response("Unauthorized", { status: 401 });
}
