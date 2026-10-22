import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_BASE_PATH } from "@/features/admin-access";
import { ADMIN_COOKIE } from "@/features/admin-access/access";

export const dynamic = "force-dynamic";

/** Signs this browser out: the cookie is cleared and the browser lands on the login page. POST only, so a link or an image on another site cannot trigger it. */
export function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL(`${ADMIN_BASE_PATH}/login`, req.url), 303);
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || req.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
