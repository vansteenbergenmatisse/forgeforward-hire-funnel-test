import { createProject, listProjects, readBody, respond, schemas } from "@/features/projects/server";
import { recordAudit } from "@/features/admin-access/server";
import { requireAdmin } from "@/features/admin-access";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(() => listProjects());
}

export function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const out = await createProject(await readBody(req, schemas.createProjectBody));
    await recordAudit({ action: "project.create", targetType: "project", targetId: out.def.slug });
    return out;
  }, 201);
}
