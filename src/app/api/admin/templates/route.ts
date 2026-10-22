import { createTemplate, readBody, respond, schemas } from "@/features/projects/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return respond(async () => createTemplate(await readBody(req, schemas.createTemplateBody)), 201);
}
