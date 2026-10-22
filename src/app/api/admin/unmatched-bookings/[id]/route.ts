import { NextResponse, type NextRequest } from "next/server";
import { UUID_RE, dismissUnmatchedBooking, isAdminRequest } from "@/features/applicants/server";

export const dynamic = "force-dynamic";

/** Dismiss an unmatched booking. */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/admin/unmatched-bookings/[id]">) {
  if (!isAdminRequest(req)) return new NextResponse("Not found", { status: 404 });
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await dismissUnmatchedBooking(id))) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json({ ok: true });
}
