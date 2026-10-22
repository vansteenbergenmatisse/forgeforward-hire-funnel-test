import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { UUID_RE, getApplicant, isAdminRequest, linkUnmatchedBooking } from "@/features/applicants/server";

export const dynamic = "force-dynamic";

const body = z.object({ applicantId: z.string().uuid() }).strict();

/** Link an unmatched booking to an applicant. Returns the updated applicant. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/admin/unmatched-bookings/[id]/link">) {
  if (!isAdminRequest(req)) return new NextResponse("Not found", { status: 404 });
  const { id } = await ctx.params;
  const b = body.safeParse(await req.json().catch(() => null));
  if (!UUID_RE.test(id) || !b.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const r = await linkUnmatchedBooking(id, b.data.applicantId);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "already_resolved" ? 409 : 404 });
  const applicant = await getApplicant(b.data.applicantId);
  return applicant ? NextResponse.json({ applicant }) : new NextResponse("Not found", { status: 404 });
}
