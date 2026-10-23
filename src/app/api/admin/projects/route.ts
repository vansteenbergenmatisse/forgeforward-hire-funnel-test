import { after } from "next/server";
import { createProject, listProjects, readBody, respond, schemas } from "@/features/projects/server";
import { recordAudit } from "@/features/admin-access/server";
import { requireAdmin } from "@/features/admin-access/access";
import { finishPendingDeletions, hasPendingDeletions } from "@/features/project-lifecycle/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const list = await listProjects();
    // A deletion that ran out of time finishes here, after the list is sent.
    if (await hasPendingDeletions()) after(() => void finishPendingDeletions({ budgetMs: 40_000 }).catch(() => undefined));
    return list;
  });
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
