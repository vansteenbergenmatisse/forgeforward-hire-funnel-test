import { NextResponse, type NextRequest } from "next/server";
import { handleWhatsAppEvents, webhookStore } from "@/features/messaging/server";
import { verifyHandshake, verifySignature } from "@/platform/whatsapp";

export const dynamic = "force-dynamic";

const MAX_BODY = 1_000_000;

/** Meta verify handshake. */
export function GET(req: NextRequest) {
  const challenge = verifyHandshake(req.nextUrl.searchParams, process.env.WA_VERIFY_TOKEN);
  return challenge === null ? new NextResponse("Forbidden", { status: 403 }) : new NextResponse(challenge, { status: 200 });
}

/** Delivery statuses and inbound replies. Signed with X-Hub-Signature-256. */
export async function POST(req: NextRequest) {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY) return new NextResponse("Too large", { status: 413 });
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY) return new NextResponse("Too large", { status: 413 });
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), process.env.WA_APP_SECRET)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  try {
    await handleWhatsAppEvents(webhookStore, body);
  } catch {
    return new NextResponse("Error", { status: 500 }); // Meta retries
  }
  return NextResponse.json({ ok: true });
}
