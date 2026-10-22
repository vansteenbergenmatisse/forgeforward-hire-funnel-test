import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isValidCookie } from "@/features/admin-access/access";
import { ADMIN_BASE_PATH } from "@/features/admin-access";
import { MIN_ADMIN_KEY_LENGTH } from "@/shared/env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** True when a state-changing request comes from another site. The admin cookie is SameSite=Lax, this is the second layer. */
export function isCrossSiteMutation(method: string, origin: string | null, host: string | null, fetchSite: string | null) {
  if (SAFE_METHODS.has(method.toUpperCase())) return false;
  if (fetchSite === "cross-site" || fetchSite === "same-site") return true;
  if (origin === null) return false;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

const PRIVATE = "private, no-store";

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", PRIVATE);
  return res;
}

// Admin gate. Without a valid cookie every admin page and admin API returns 404.
/** "/adminmatt/x" -> "/adminMatt/x". Null when the path is not the admin base in a different case. */
export function canonicalAdminPath(pathname: string): string | null {
  const lower = ADMIN_BASE_PATH.toLowerCase();
  const head = pathname.slice(0, lower.length);
  if (head.toLowerCase() !== lower || head === ADMIN_BASE_PATH) return null;
  const rest = pathname.slice(lower.length);
  return rest === "" || rest.startsWith("/") ? `${ADMIN_BASE_PATH}${rest}` : null;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const adminKey = process.env.ADMIN_KEY;
  // A short key is a misconfiguration. Fail closed instead of guarding PII with a guessable key.
  if (!adminKey || adminKey.length < MIN_ADMIN_KEY_LENGTH) return noStore(new NextResponse("Not found", { status: 404 }));
  // Any letter case of the admin path works. Unknown visitors still get the same 404 for every spelling.
  const canonical = canonicalAdminPath(pathname);
  const target = canonical ?? pathname;
  const rewriteTo = (res: () => NextResponse) => {
    if (!canonical) return res();
    const url = req.nextUrl.clone();
    url.pathname = canonical;
    return NextResponse.rewrite(url);
  };
  if (target.startsWith(`${ADMIN_BASE_PATH}/k/`)) return noStore(rewriteTo(() => NextResponse.next()));
  const ok = isValidCookie(req.cookies.get(ADMIN_COOKIE)?.value, adminKey);
  if (!ok) return noStore(new NextResponse("Not found", { status: 404 }));
  if (isCrossSiteMutation(req.method, req.headers.get("origin"), req.headers.get("host"), req.headers.get("sec-fetch-site"))) {
    return noStore(new NextResponse("Forbidden", { status: 403 }));
  }
  const res = noStore(rewriteTo(() => NextResponse.next()));
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

// Next reads the matcher statically, so it cannot use ADMIN_BASE_PATH. Keep it in step with that constant. The character class makes every letter case of the admin path reach the proxy.
export const config = { matcher: ["/:base([aA][dD][mM][iI][nN][mM][aA][tT][tT])/:path*", "/api/admin/:path*"] };
