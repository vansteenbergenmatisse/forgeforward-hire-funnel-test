import { getProject, respond, schemas } from "@/features/projects/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/admin/projects/[slug]">) {
  return respond(async () => getProject(schemas.slugParam.parse((await ctx.params).slug)));
}
