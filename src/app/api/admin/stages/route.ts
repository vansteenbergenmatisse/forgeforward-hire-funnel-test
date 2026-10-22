import { createStage, readBody, respond, schemas } from "@/features/projects/server";
import { recordAudit } from "@/features/admin-access/server";
import { requireAdmin } from "@/features/admin-access";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const out = await createStage(await readBody(req, schemas.createStageBody));
    await recordAudit({ action: "stage.create", targetType: "stage", targetId: out.id });
    return out;
  }, 201);
}
