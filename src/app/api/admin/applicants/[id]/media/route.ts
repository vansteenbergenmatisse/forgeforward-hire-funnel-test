import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin-access/access";
import { z } from "zod";
import { PRIVATE_NO_STORE, UUID_RE, signedMediaUrl } from "@/features/applicants/server";

export const dynamic = "force-dynamic";

const query = z.object({ kind: z.enum(["video", "thumb", "task"]).default("video"), format: z.enum(["redirect", "json"]).default("redirect") });

/** Signed GET URL for the player. Default answer is a redirect, so <video src> works. `?format=json` returns the URL. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/applicants/[id]/media">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const q = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!UUID_RE.test(id) || !q.success) return new NextResponse("Not found", { status: 404 });
  const signed = await signedMediaUrl(id, q.data.kind);
  if (!signed) return new NextResponse("Not found", { status: 404 });
  // The signed URL works without the admin cookie, so it must not leak through Referer headers or caches.
  const headers = { ...PRIVATE_NO_STORE, "referrer-policy": "no-referrer" };
  if (q.data.format === "json") return NextResponse.json(signed, { headers });
  return NextResponse.redirect(signed.url, { status: 302, headers });
}
