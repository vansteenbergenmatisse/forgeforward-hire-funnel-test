import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin-access";
import { channelModes, countTestData, testTarget } from "@/features/test-console/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json(
    { target: testTarget(), modes: channelModes(), counts: await countTestData() },
    { headers: { "cache-control": "no-store" } },
  );
}
