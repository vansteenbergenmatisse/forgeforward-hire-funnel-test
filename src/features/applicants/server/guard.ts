import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, isValidCookie } from "@/features/admin-access";

/** Second check behind proxy.ts: the admin cookie must be valid on every admin API call. */
export function isAdminRequest(req: NextRequest): boolean {
  return isValidCookie(req.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_KEY);
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
