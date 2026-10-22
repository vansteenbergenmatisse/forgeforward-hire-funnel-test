import { NextResponse } from "next/server";
import { fakeSession, handle, idempotencyKey, isHoneypot, readJson, startApplication } from "@/features/applicant-funnel/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    if (isHoneypot(body)) return NextResponse.json(fakeSession());
    return startApplication(req, body, idempotencyKey(req));
  });
}
