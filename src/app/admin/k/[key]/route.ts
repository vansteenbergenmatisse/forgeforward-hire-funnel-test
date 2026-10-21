import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, cookieValue, isValidKey } from "@/features/admin-access";

export async function GET(req: NextRequest, ctx: RouteContext<"/admin/k/[key]">) {
  const { key } = await ctx.params;
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || !isValidKey(key, adminKey)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set(ADMIN_COOKIE, cookieValue(adminKey), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
