import { createQuestion, readBody, respond, schemas } from "@/features/projects/server";
import { recordAudit } from "@/features/admin-access/server";
import { requireAdmin } from "@/features/admin-access/access";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return respond(async () => {
    const out = await createQuestion(await readBody(req, schemas.createQuestionBody));
    await recordAudit({ action: "question.create", targetType: "question", targetId: out.id });
    return out;
  }, 201);
}
