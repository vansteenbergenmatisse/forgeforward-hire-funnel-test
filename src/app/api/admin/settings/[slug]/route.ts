import { recordAudit } from "@/features/admin-access/server";
import { requireAdmin } from "@/features/admin-access/access";
import { getSettings, readBody, respond, schemas, updateSettings } from "@/features/projects/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/api/admin/settings/[slug]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => getSettings(schemas.slugParam.parse((await ctx.params).slug)));
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/settings/[slug]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const slug = schemas.slugParam.parse((await ctx.params).slug);
    const patch = await readBody(req, schemas.settingsPatch);
    const out = await updateSettings(slug, patch);
    await recordAudit({ action: "settings.update", targetType: "project", targetId: slug, detail: { fields: Object.keys(patch) } });
    return out;
  });
}
