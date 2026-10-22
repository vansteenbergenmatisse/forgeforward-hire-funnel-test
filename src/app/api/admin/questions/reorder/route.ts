import { recordAudit } from "@/features/admin-access/server";
import { requireAdmin } from "@/features/admin-access";
import { readBody, reorderQuestions, respond, schemas } from "@/features/projects/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const body = await readBody(req, schemas.reorderBody);
    const out = await reorderQuestions(body.projectSlug, body.ids);
    await recordAudit({ action: "question.reorder", targetType: "project", targetId: body.projectSlug, detail: { count: body.ids.length } });
    return out;
  });
}
