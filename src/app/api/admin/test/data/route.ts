import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest } from "@/features/applicants/server";
import { countTestData, deleteTestData } from "@/features/test-console/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(await countTestData(), { headers: { "cache-control": "no-store" } });
}

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(await deleteTestData());
}
