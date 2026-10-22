import { getProject, respond, schemas } from "@/features/projects/server";
import { requireAdmin } from "@/features/admin-access/access";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/api/admin/projects/[slug]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => getProject(schemas.slugParam.parse((await ctx.params).slug)));
}
