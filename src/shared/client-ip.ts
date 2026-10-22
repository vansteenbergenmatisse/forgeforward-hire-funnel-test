/**
 * Caller IP. On Vercel the platform sets x-vercel-forwarded-for and overwrites x-forwarded-for. Elsewhere the
 * rightmost x-forwarded-for entry is the one our own proxy appended, so a client cannot choose it.
 */
export function clientIp(req: Pick<Request, "headers">): string {
  const vercel = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const parts = req.headers.get("x-forwarded-for")?.split(",") ?? [];
  return parts[parts.length - 1]?.trim() || "unknown";
}
