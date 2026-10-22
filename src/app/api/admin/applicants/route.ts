import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin-access/access";
import { z } from "zod";
import { PRIVATE_NO_STORE, listApplicantsPage } from "@/features/applicants/server";

export const dynamic = "force-dynamic";

const query = z.object({
  project: z.string().max(100).optional(),
  stage: z.string().uuid().optional(),
  step: z.enum(["completed", "dnf"]).optional(),
  unread: z.enum(["1", "true"]).optional(),
  q: z.string().trim().max(100).optional(),
  includeTest: z.enum(["0", "1", "true", "false"]).optional(),
  /** "1" adds the timeline and messages of every row. The board does not need them: GET /applicants/{id} has them. */
  detail: z.enum(["0", "1"]).optional(),
  limit: z.coerce.number().int().min(1).max(5000).optional(),
});

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  const p = parsed.data;
  const { applicants, truncated } = await listApplicantsPage({
    projectSlug: p.project,
    stageId: p.stage,
    step: p.step,
    unread: Boolean(p.unread),
    q: p.q || undefined,
    includeTest: p.includeTest === "0" || p.includeTest === "false" ? false : true,
    detail: p.detail === "1",
    limit: p.limit,
  });
  return NextResponse.json({ applicants, truncated }, { headers: PRIVATE_NO_STORE });
}
