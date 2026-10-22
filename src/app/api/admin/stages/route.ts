import { createStage, readBody, respond, schemas } from "@/features/projects/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return respond(async () => createStage(await readBody(req, schemas.createStageBody)), 201);
}
