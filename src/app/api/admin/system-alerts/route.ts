import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin-access";
import { recordAudit } from "@/features/admin-access/server";
import { z } from "zod";
import { getSystemAlerts, resolveAlert } from "@/features/backups/server";
import { PRIVATE_NO_STORE } from "@/features/applicants/server";

export const dynamic = "force-dynamic";


// The proxy (src/proxy.ts) gates /api/admin/*. The cookie is checked here again, as in the other admin routes.
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ alerts: await getSystemAlerts() }, { headers: PRIVATE_NO_STORE });
}

const body = z.object({ id: z.string().min(1).max(100) });

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  // A plain form or text/plain post from another site cannot set this type without a CORS preflight.
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "Send application/json" }, { status: 415, headers: PRIVATE_NO_STORE });
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400, headers: PRIVATE_NO_STORE });
  const ok = await resolveAlert(parsed.data.id);
  if (ok) await recordAudit({ action: "alert.resolve", targetType: "system_alert", targetId: parsed.data.id });
  return ok
    ? NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE })
    : NextResponse.json({ error: "This alert clears itself" }, { status: 400, headers: PRIVATE_NO_STORE });
}
