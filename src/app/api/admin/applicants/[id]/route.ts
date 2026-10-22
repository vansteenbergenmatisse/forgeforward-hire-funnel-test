import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin-access/access";
import { recordAudit } from "@/features/admin-access/server";
import { z } from "zod";
import {
  PRIVATE_NO_STORE,
  UUID_RE,
  deleteApplicant,
  getApplicant,
  
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

const notFound = () => new NextResponse("Not found", { status: 404, headers: PRIVATE_NO_STORE });
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_NO_STORE });

export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/applicants/[id]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return notFound();
  const applicant = await getApplicant(id);
  return applicant ? json({ applicant }) : notFound();
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/applicants/[id]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return notFound();
  const body = patch.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "invalid_body" }, 400);
  const b = body.data;

  let last: CommandResult | null = null;
  if (b.stageId !== undefined) last = await moveStage(id, b.stageId);
  if (b.score !== undefined && (!last || last.ok)) last = await setScore(id, b.score);
  if (b.notes !== undefined && (!last || last.ok)) last = await setNotes(id, b.notes);
  if (b.unreadReply === false && (!last || last.ok)) last = await markRead(id);

  if (!last) return json({ error: "invalid_body" }, 400);
  if (!last.ok) {
    return last.error === "not_found" ? notFound() : json({ error: last.error }, 400);
  }
  // Ids and field names only. Notes and scores are applicant data.
  if (b.stageId !== undefined) await recordAudit({ action: "applicant.move", targetType: "applicant", targetId: id, detail: { toStageId: b.stageId } });
  const otherFields = Object.keys(b).filter((k) => k !== "stageId");
  if (otherFields.length > 0) await recordAudit({ action: "applicant.update", targetType: "applicant", targetId: id, detail: { fields: otherFields } });
  const applicant = await getApplicant(id);
  return applicant ? json({ applicant }) : notFound();
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/admin/applicants/[id]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return notFound();
  const r = await deleteApplicant(id);
  if (r.ok) {
    await recordAudit({ action: "applicant.delete", targetType: "applicant", targetId: id });
    return json({ ok: true });
  }
  return r.error === "not_found" ? notFound() : json({ error: r.error }, 502);
}
