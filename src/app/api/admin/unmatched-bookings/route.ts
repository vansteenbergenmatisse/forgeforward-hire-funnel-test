import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin-access/access";
import { PRIVATE_NO_STORE, listUnmatchedBookings } from "@/features/applicants/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ bookings: await listUnmatchedBookings() }, { headers: PRIVATE_NO_STORE });
}
