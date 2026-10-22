import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin-access";
import { recordAudit } from "@/features/admin-access/server";
import { z } from "zod";
import { PRIVATE_NO_STORE, UUID_RE, getApplicant, linkUnmatchedBooking } from "@/features/applicants/server";

export const dynamic = "force-dynamic";

const body = z.object({ applicantId: z.string().uuid() }).strict();

/** Link an unmatched booking to an applicant. Returns the updated applicant. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/admin/unmatched-bookings/[id]/link">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const b = body.safeParse(await req.json().catch(() => null));
  if (!UUID_RE.test(id) || !b.success) return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: PRIVATE_NO_STORE });
  const r = await linkUnmatchedBooking(id, b.data.applicantId);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "already_resolved" ? 409 : 404, headers: PRIVATE_NO_STORE });
  await recordAudit({ action: "unmatched_booking.link", targetType: "unmatched_booking", targetId: id, detail: { applicantId: b.data.applicantId } });
  const applicant = await getApplicant(b.data.applicantId);
  return applicant ? NextResponse.json({ applicant }, { headers: PRIVATE_NO_STORE }) : new NextResponse("Not found", { status: 404 });
}
