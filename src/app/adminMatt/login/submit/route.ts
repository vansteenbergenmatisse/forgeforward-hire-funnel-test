import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_BASE_PATH } from "@/features/admin-access";
import { ADMIN_COOKIE, adminCookieOptions, cookieValue } from "@/features/admin-access/access";
import { attemptLogin } from "@/features/admin-access/server";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } as const;

function answer(status: number, error?: string) {
  return NextResponse.json(error ? { ok: false, error } : { ok: true, next: ADMIN_BASE_PATH }, { status, headers: HEADERS });
}

/** Password login. The proxy lets only a same-origin POST reach this route without the cookie. */
export async function POST(req: NextRequest) {
  let password = "";
  try {
    const body: unknown = await req.json();
    if (body && typeof body === "object" && "password" in body && typeof body.password === "string") password = body.password;
  } catch {
    /* an unreadable body is a wrong password */
  }
  const result = await attemptLogin(req, password);
  if (!result.ok) {
    if (result.reason === "limited") return answer(429, "Too many tries. Wait 15 minutes.");
    if (result.reason === "wrong") return answer(401, "Wrong password.");
    return answer(401, "Password sign in is not available.");
  }
  const adminKey = process.env.ADMIN_KEY as string;
  const res = answer(200);
  res.cookies.set(ADMIN_COOKIE, cookieValue(adminKey), adminCookieOptions(process.env.NODE_ENV === "production" || req.nextUrl.protocol === "https:"));
  return res;
}
