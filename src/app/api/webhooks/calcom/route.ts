import { NextResponse, type NextRequest } from "next/server";
import { CALCOM_SIGNATURE_HEADER, handleCalcomWebhook } from "@/features/bookings/server";

export const dynamic = "force-dynamic";

const MAX_BODY = 256 * 1024;

export async function POST(req: NextRequest) {
  // The signature covers the exact bytes, so read the raw text before any JSON parsing.
  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });
  try {
    const out = await handleCalcomWebhook(raw, req.headers.get(CALCOM_SIGNATURE_HEADER), {
      secret: process.env.CALCOM_WEBHOOK_SECRET || undefined,
      nodeEnv: process.env.NODE_ENV,
      log: (m) => console.error(m),
    });
    if (out.result === "error") return NextResponse.json({ error: out.reason }, { status: out.status });
    return NextResponse.json({ ok: true, result: out.result });
  } catch {
    console.error("calcom webhook failed");
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
