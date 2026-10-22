import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest } from "@/features/applicants/server";
import { channelModes, countTestData, testTarget } from "@/features/test-console/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(
    { target: testTarget(), modes: channelModes(), counts: await countTestData() },
    { headers: { "cache-control": "no-store" } },
  );
}
