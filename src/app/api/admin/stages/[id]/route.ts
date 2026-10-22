import { deleteStage, readBody, respond, schemas, updateStage } from "@/features/projects/server";
import { recordAudit } from "@/features/admin-access/server";
import { requireAdmin } from "@/features/admin-access";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/stages/[id]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const id = schemas.uuidParam.parse((await ctx.params).id);
    const patch = await readBody(req, schemas.updateStageBody);
    const out = await updateStage(id, patch);
    await recordAudit({ action: "stage.update", targetType: "stage", targetId: id, detail: { fields: Object.keys(patch) } });
    return out;
  });
}

/** `?moveTo=<stage id>` is required when the stage still holds applicants. */
export async function DELETE(req: Request, ctx: RouteContext<"/api/admin/stages/[id]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const id = schemas.uuidParam.parse((await ctx.params).id);
    const moveTo = new URL(req.url).searchParams.get("moveTo");
    const target = moveTo ? schemas.uuidParam.parse(moveTo) : undefined;
    const out = await deleteStage(id, target);
    await recordAudit({ action: "stage.delete", targetType: "stage", targetId: id, detail: target ? { moveTo: target } : {} });
    return out;
  });
}
