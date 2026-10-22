import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  clearFailures,
  clientIp,
  cookieValue,
  isBlocked,
  isValidKey,
  recordFailure,
} from "@/features/admin-access";
import { recordSystemError } from "@/platform/logging/system-errors";

export const dynamic = "force-dynamic";

/** The key is in the URL, so keep the response out of caches and do not let the address travel in a Referer header. */
const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

function notFound(status = 404) {
  return new NextResponse("Not found", { status, headers: PRIVATE_HEADERS });
}

async function logFailure(ip: string) {
  try {
    // Only a short hash of the address is stored, never the key that was tried.
    const who = createHash("sha256").update(ip).digest("hex").slice(0, 12);
    await recordSystemError({ source: "admin.key", message: "Someone tried a wrong admin key.", data: { ip: who } });
  } catch {
    /* logging must never change the answer */
  }
}

export async function GET(req: NextRequest, ctx: RouteContext<"/admin/k/[key]">) {
  const { key } = await ctx.params;
  const ip = clientIp(req.headers.get("x-forwarded-for"));
  if (isBlocked(ip)) return notFound(429);
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || !isValidKey(key, adminKey)) {
    recordFailure(ip);
    await logFailure(ip);
    return notFound();
  }
  clearFailures(ip);
  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set(ADMIN_COOKIE, cookieValue(adminKey), {
    httpOnly: true,
    // The __Host- name used in production needs Secure. Plain http is only for local development.
    secure: process.env.NODE_ENV === "production" || req.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  for (const [k, v] of Object.entries(PRIVATE_HEADERS)) res.headers.set(k, v);
  return res;
}
