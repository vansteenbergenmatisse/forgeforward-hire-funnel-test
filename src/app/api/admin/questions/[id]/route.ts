import { deleteQuestion, readBody, respond, schemas, updateQuestion } from "@/features/projects/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/questions/[id]">) {
  return respond(async () => {
    const id = schemas.uuidParam.parse((await ctx.params).id);
    return updateQuestion(id, await readBody(req, schemas.updateQuestionBody));
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/admin/questions/[id]">) {
  return respond(async () => deleteQuestion(schemas.uuidParam.parse((await ctx.params).id)));
}
