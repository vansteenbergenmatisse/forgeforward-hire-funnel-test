import { getSettings, readBody, respond, schemas, updateSettings } from "@/features/projects/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/admin/settings/[slug]">) {
  return respond(async () => getSettings(schemas.slugParam.parse((await ctx.params).slug)));
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/settings/[slug]">) {
  return respond(async () => {
    const slug = schemas.slugParam.parse((await ctx.params).slug);
    return updateSettings(slug, await readBody(req, schemas.settingsPatch));
  });
}
