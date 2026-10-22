import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest, listUnmatchedBookings } from "@/features/applicants/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json({ bookings: await listUnmatchedBookings() }, { headers: { "cache-control": "no-store" } });
}
