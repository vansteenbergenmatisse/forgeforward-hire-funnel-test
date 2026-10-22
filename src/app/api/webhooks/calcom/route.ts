import { NextResponse, type NextRequest } from "next/server";
import { CALCOM_SIGNATURE_HEADER, handleCalcomWebhook } from "@/features/bookings/server";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;

/** Reasons stay in the server log. Callers only learn the status. */
const GENERIC_ERROR = { 400: "bad_request", 401: "unauthorized", 503: "unavailable" } as const;

export async function POST(req: NextRequest) {
  // Refuse a declared oversized body before reading it. The signature needs the exact bytes, so the body is read as text.
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
  try {
    const out = await handleCalcomWebhook(raw, req.headers.get(CALCOM_SIGNATURE_HEADER), {
      secret: process.env.CALCOM_WEBHOOK_SECRET || undefined,
      log: (m) => console.error(m),
    });
    if (out.result === "error") return NextResponse.json({ error: GENERIC_ERROR[out.status] }, { status: out.status });
    return NextResponse.json({ ok: true, result: out.result });
  } catch {
    console.error("calcom webhook failed");
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
