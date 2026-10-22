import { deleteTemplate, readBody, respond, schemas, updateTemplate } from "@/features/projects/server";
import { recordAudit } from "@/features/admin-access/server";
import { requireAdmin } from "@/features/admin-access";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/templates/[id]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const id = schemas.uuidParam.parse((await ctx.params).id);
    const patch = await readBody(req, schemas.updateTemplateBody);
    const out = await updateTemplate(id, patch);
    await recordAudit({ action: "template.update", targetType: "template", targetId: id, detail: { fields: Object.keys(patch) } });
    return out;
  });
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/admin/templates/[id]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const id = schemas.uuidParam.parse((await ctx.params).id);
    const out = await deleteTemplate(id);
    await recordAudit({ action: "template.delete", targetType: "template", targetId: id });
    return out;
  });
}
