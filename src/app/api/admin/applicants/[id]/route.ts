import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  UUID_RE,
  deleteApplicant,
  getApplicant,
  isAdminRequest,
  markRead,
  moveStage,
  setNotes,
  setScore,
  type CommandResult,
} from "@/features/applicants/server";

export const dynamic = "force-dynamic";

const patch = z
  .object({
    stageId: z.string().uuid(),
    score: z.number().int().min(1).max(5).nullable(),
    notes: z.string().max(20_000),
    unreadReply: z.literal(false),
  })
  .partial()
  .strict()
  .refine((b) => Object.keys(b).length > 0, "empty patch");

const notFound = () => new NextResponse("Not found", { status: 404 });

export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/applicants/[id]">) {
  if (!isAdminRequest(req)) return notFound();
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return notFound();
  const applicant = await getApplicant(id);
  return applicant ? NextResponse.json({ applicant }) : notFound();
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/applicants/[id]">) {
  if (!isAdminRequest(req)) return notFound();
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return notFound();
  const body = patch.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const b = body.data;

  let last: CommandResult | null = null;
  if (b.stageId !== undefined) last = await moveStage(id, b.stageId);
  if (b.score !== undefined && (!last || last.ok)) last = await setScore(id, b.score);
  if (b.notes !== undefined && (!last || last.ok)) last = await setNotes(id, b.notes);
  if (b.unreadReply === false && (!last || last.ok)) last = await markRead(id);

  if (!last) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  if (!last.ok) {
    return last.error === "not_found" ? notFound() : NextResponse.json({ error: last.error }, { status: 400 });
  }
  const applicant = await getApplicant(id);
  return applicant ? NextResponse.json({ applicant }) : notFound();
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/admin/applicants/[id]">) {
  if (!isAdminRequest(req)) return notFound();
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return notFound();
  const r = await deleteApplicant(id);
  if (r.ok) return NextResponse.json({ ok: true });
  return r.error === "not_found" ? notFound() : NextResponse.json({ error: r.error }, { status: 502 });
}
