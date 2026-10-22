import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/features/admin-access";

export const dynamic = "force-dynamic";

/** Signs this browser out: the cookie is cleared. POST only, so a link or an image on another site cannot trigger it. */
export function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin", req.url), 303);
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
