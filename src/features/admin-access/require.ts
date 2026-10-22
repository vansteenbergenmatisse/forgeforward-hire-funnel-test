import { ADMIN_COOKIE, isValidCookie } from "./gate";

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

/**
 * Second check behind proxy.ts. Call it first in every admin route handler.
 * Returns a 404 response when the admin cookie is missing or invalid, otherwise null.
 */
export function requireAdmin(req: Request): Response | null {
  const ok = isValidCookie(readCookie(req.headers.get("cookie"), ADMIN_COOKIE), process.env.ADMIN_KEY);
  return ok ? null : new Response("Not found", { status: 404, headers: { "cache-control": "private, no-store" } });
}
