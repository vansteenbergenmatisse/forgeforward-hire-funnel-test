import { createQuestion, readBody, respond, schemas } from "@/features/projects/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return respond(async () => createQuestion(await readBody(req, schemas.createQuestionBody)), 201);
}
