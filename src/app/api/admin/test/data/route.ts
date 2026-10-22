import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin-access";
import { recordAudit } from "@/features/admin-access/server";
import { countTestData, deleteTestData } from "@/features/test-console/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json(await countTestData(), { headers: { "cache-control": "no-store" } });
}

export async function DELETE(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const removed = await countTestData();
  const left = await deleteTestData();
  await recordAudit({ action: "test_data.delete", targetType: "test_data", detail: { removed, left } });
  // The response is what is left, so the console shows 0 after a clean delete.
  return NextResponse.json(left, { headers: { "cache-control": "no-store" } });
}
