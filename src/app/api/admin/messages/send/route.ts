import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isValidCookie } from "@/features/admin-access";
import { sendApplicantMessage, sendRequestSchema, sendStore } from "@/features/messaging/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Defence in depth: proxy.ts already gates /api/admin.
  if (!isValidCookie(req.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_KEY)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const parsed = sendRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, code: "invalid", error: "Invalid request." }, { status: 400 });
  try {
    const out = await sendApplicantMessage(sendStore, parsed.data);
    if (out.ok) return NextResponse.json(out);
    const status = out.code === "not_found" ? 404 : out.code === "provider" ? 502 : out.code === "not_configured" ? 409 : 422;
    return NextResponse.json(out, { status });
  } catch {
    return NextResponse.json({ ok: false, code: "provider", error: "Could not send. Try again." }, { status: 500 });
  }
}
