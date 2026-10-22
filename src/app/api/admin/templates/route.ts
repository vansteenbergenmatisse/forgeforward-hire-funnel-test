import { createTemplate, readBody, respond, schemas } from "@/features/projects/server";
import { recordAudit } from "@/features/admin-access/server";
import { requireAdmin } from "@/features/admin-access/access";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const out = await createTemplate(await readBody(req, schemas.createTemplateBody));
    await recordAudit({ action: "template.create", targetType: "template", targetId: out.id });
    return out;
  }, 201);
}
