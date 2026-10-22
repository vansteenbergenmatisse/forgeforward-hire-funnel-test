import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin-access";
import { recordAudit } from "@/features/admin-access/server";
import { z } from "zod";
import { callbackOrigin, sendTestMessage } from "@/features/test-console/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const body = z.object({ channel: z.enum(["email", "whatsapp", "sms"]) });

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  await recordAudit({ action: "test_message.send", targetType: "test_console", detail: { channel: parsed.data.channel } });
  return NextResponse.json(await sendTestMessage({ origin: callbackOrigin(req.nextUrl.origin, process.env.APP_URL) }, parsed.data.channel));
}
