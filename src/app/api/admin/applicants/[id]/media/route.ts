import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { UUID_RE, isAdminRequest, signedMediaUrl } from "@/features/applicants/server";

export const dynamic = "force-dynamic";

const query = z.object({ kind: z.enum(["video", "thumb", "task"]).default("video"), format: z.enum(["redirect", "json"]).default("redirect") });

/** Signed GET URL for the player. Default answer is a redirect, so <video src> works. `?format=json` returns the URL. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/applicants/[id]/media">) {
  if (!isAdminRequest(req)) return new NextResponse("Not found", { status: 404 });
  const { id } = await ctx.params;
  const q = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!UUID_RE.test(id) || !q.success) return new NextResponse("Not found", { status: 404 });
  const signed = await signedMediaUrl(id, q.data.kind);
  if (!signed) return new NextResponse("Not found", { status: 404 });
  if (q.data.format === "json") return NextResponse.json(signed, { headers: { "cache-control": "no-store" } });
  return NextResponse.redirect(signed.url, { status: 302, headers: { "cache-control": "no-store" } });
}
