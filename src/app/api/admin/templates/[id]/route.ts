import { deleteTemplate, readBody, respond, schemas, updateTemplate } from "@/features/projects/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/templates/[id]">) {
  return respond(async () => {
    const id = schemas.uuidParam.parse((await ctx.params).id);
    return updateTemplate(id, await readBody(req, schemas.updateTemplateBody));
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/admin/templates/[id]">) {
  return respond(async () => deleteTemplate(schemas.uuidParam.parse((await ctx.params).id)));
}
