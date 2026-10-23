import { ApiError, getProject, readBody, respond, schemas, setProjectStatus } from "@/features/projects/server";
import { deleteProject, previewProjectDeletion } from "@/features/project-lifecycle/server";
import { recordAudit } from "@/features/admin-access/server";
import { requireAdmin } from "@/features/admin-access/access";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request, ctx: RouteContext<"/api/admin/projects/[slug]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => getProject(schemas.slugParam.parse((await ctx.params).slug)));
}

// Deactivate ("closed") or reactivate ("open"). Reversible, so no confirmation is needed.
export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/projects/[slug]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const slug = schemas.slugParam.parse((await ctx.params).slug);
    const { status } = await readBody(req, schemas.statusBody);
    const out = await setProjectStatus(slug, status);
    if (out.changed) {
      await recordAudit({ action: status === "closed" ? "project.deactivate" : "project.reactivate", targetType: "project", targetId: slug, detail: { from: out.from, to: status } });
    }
    return { slug, status };
  });
}

// ?preview=1 returns the counts the confirmation dialog shows and deletes nothing.
// Without it the project is deleted. A call that returns done:false is continued by calling again.
export async function DELETE(req: Request, ctx: RouteContext<"/api/admin/projects/[slug]">) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const slug = schemas.slugParam.parse((await ctx.params).slug);
    if (new URL(req.url).searchParams.get("preview") === "1") return previewProjectDeletion(slug);
    const { confirmSlug } = await readBody(req, schemas.deleteProjectBody);
    if (confirmSlug !== slug) throw new ApiError(422, "confirm_mismatch", "The confirmation does not match this project.");
    return deleteProject(slug);
  });
}
