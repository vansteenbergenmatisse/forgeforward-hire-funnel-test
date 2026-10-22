import { deleteQuestion, readBody, respond, schemas, updateQuestion } from "@/features/projects/server";
import { recordAudit } from "@/features/admin-access/server";
import { requireAdmin } from "@/features/admin-access/access";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/questions/[id]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const id = schemas.uuidParam.parse((await ctx.params).id);
    const patch = await readBody(req, schemas.updateQuestionBody);
    const out = await updateQuestion(id, patch);
    await recordAudit({ action: "question.update", targetType: "question", targetId: id, detail: { fields: Object.keys(patch) } });
    return out;
  });
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/admin/questions/[id]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const id = schemas.uuidParam.parse((await ctx.params).id);
    const out = await deleteQuestion(id);
    await recordAudit({ action: "question.delete", targetType: "question", targetId: id });
    return out;
  });
}
