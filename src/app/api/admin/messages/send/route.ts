import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin-access/access";
import { recordAudit } from "@/features/admin-access/server";
import { PRIVATE_NO_STORE } from "@/features/applicants/server";
import { sendApplicantMessage, sendRequestSchema, sendStore } from "@/features/messaging/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = sendRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, code: "invalid", error: "Invalid request." }, { status: 400, headers: PRIVATE_NO_STORE });
  try {
    const out = await sendApplicantMessage(sendStore, parsed.data);
    if (out.ok) {
      await recordAudit({ action: "message.send", targetType: "applicant", targetId: parsed.data.applicantId, detail: { channel: parsed.data.channel } });
      return NextResponse.json(out, { headers: PRIVATE_NO_STORE });
    }
    const status = out.code === "not_found" ? 404 : out.code === "provider" ? 502 : out.code === "not_configured" ? 409 : 422;
    return NextResponse.json(out, { status, headers: PRIVATE_NO_STORE });
  } catch {
    return NextResponse.json({ ok: false, code: "provider", error: "Could not send. Try again." }, { status: 500, headers: PRIVATE_NO_STORE });
  }
}
