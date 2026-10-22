import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/features/applicants/server";
import { sendTestMessage } from "@/features/test-console/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const body = z.object({ channel: z.enum(["email", "whatsapp", "sms"]) });

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return new NextResponse("Not found", { status: 404 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  return NextResponse.json(await sendTestMessage({ origin: req.nextUrl.origin }, parsed.data.channel));
}
