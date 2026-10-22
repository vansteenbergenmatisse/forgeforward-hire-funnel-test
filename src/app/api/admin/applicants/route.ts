import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdminRequest, listApplicants } from "@/features/applicants/server";

export const dynamic = "force-dynamic";

const query = z.object({
  project: z.string().max(100).optional(),
  stage: z.string().uuid().optional(),
  step: z.enum(["completed", "dnf"]).optional(),
  unread: z.enum(["1", "true"]).optional(),
  q: z.string().trim().max(100).optional(),
  includeTest: z.enum(["0", "1", "true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(5000).optional(),
});

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return new NextResponse("Not found", { status: 404 });
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  const p = parsed.data;
  const applicants = await listApplicants({
    projectSlug: p.project,
    stageId: p.stage,
    step: p.step,
    unread: Boolean(p.unread),
    q: p.q || undefined,
    includeTest: p.includeTest === "0" || p.includeTest === "false" ? false : true,
    limit: p.limit,
  });
  return NextResponse.json({ applicants }, { headers: { "cache-control": "no-store" } });
}
