import { recordAudit } from "@/features/admin-access/server";
import { requireAdmin } from "@/features/admin-access";
import { readBody, reorderStages, respond, schemas } from "@/features/projects/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const body = await readBody(req, schemas.reorderBody);
    const out = await reorderStages(body.projectSlug, body.ids);
    await recordAudit({ action: "stage.reorder", targetType: "project", targetId: body.projectSlug, detail: { count: body.ids.length } });
    return out;
  });
}
