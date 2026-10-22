import { NextResponse } from "next/server";
import { z } from "zod";
import { getSystemAlerts, resolveAlert } from "@/features/backups/server";

export const dynamic = "force-dynamic";

// Behind the admin cookie gate (src/proxy.ts matches /api/admin/*).
export async function GET() {
  return NextResponse.json({ alerts: await getSystemAlerts() }, { headers: { "Cache-Control": "no-store" } });
}

const body = z.object({ id: z.string().min(1).max(100) });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const ok = await resolveAlert(parsed.data.id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "This alert clears itself" }, { status: 400 });
}
