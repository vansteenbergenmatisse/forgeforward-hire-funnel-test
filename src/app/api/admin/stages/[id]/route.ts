import { deleteStage, readBody, respond, schemas, updateStage } from "@/features/projects/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/stages/[id]">) {
  return respond(async () => {
    const id = schemas.uuidParam.parse((await ctx.params).id);
    return updateStage(id, await readBody(req, schemas.updateStageBody));
  });
}

/** `?moveTo=<stage id>` is required when the stage still holds applicants. */
export async function DELETE(req: Request, ctx: RouteContext<"/api/admin/stages/[id]">) {
  return respond(async () => {
    const id = schemas.uuidParam.parse((await ctx.params).id);
    const moveTo = new URL(req.url).searchParams.get("moveTo");
    return deleteStage(id, moveTo ? schemas.uuidParam.parse(moveTo) : undefined);
  });
}
