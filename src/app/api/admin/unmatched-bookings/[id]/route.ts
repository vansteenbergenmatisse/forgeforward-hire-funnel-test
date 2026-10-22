import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin-access/access";
import { recordAudit } from "@/features/admin-access/server";
import { PRIVATE_NO_STORE, UUID_RE, dismissUnmatchedBooking } from "@/features/applicants/server";

export const dynamic = "force-dynamic";

/** Dismiss an unmatched booking. */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/admin/unmatched-bookings/[id]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id) || !(await dismissUnmatchedBooking(id))) return new NextResponse("Not found", { status: 404 });
  await recordAudit({ action: "unmatched_booking.dismiss", targetType: "unmatched_booking", targetId: id });
  return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE });
}
