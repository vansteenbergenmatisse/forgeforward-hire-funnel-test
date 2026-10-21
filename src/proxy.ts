import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isValidCookie } from "@/features/admin-access";

// Admin gate. Without a valid cookie every admin page and admin API returns 404.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin/k/")) return NextResponse.next();
  const ok = isValidCookie(req.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_KEY);
  if (ok) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }
  return new NextResponse("Not found", { status: 404 });
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
