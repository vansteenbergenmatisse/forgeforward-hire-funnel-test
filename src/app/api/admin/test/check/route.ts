import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin-access/access";
import { z } from "zod";
import { callbackOrigin, runCheck } from "@/features/test-console/server";
import { CHECK_IDS } from "@/features/test-console";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const body = z.object({
  id: z.enum(CHECK_IDS),
  state: z.record(z.string(), z.union([z.string().max(20_000), z.number()])).default({}),
});

// Runs ONE of the 13 checks. The browser calls them in order and carries `state` between calls.
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const out = await runCheck(parsed.data.id, { origin: callbackOrigin(req.nextUrl.origin, process.env.APP_URL) }, parsed.data.state);
  return NextResponse.json(out, { headers: { "cache-control": "no-store" } });
}
