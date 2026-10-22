import { createProject, listProjects, readBody, respond, schemas } from "@/features/projects/server";

export const dynamic = "force-dynamic";

export function GET() {
  return respond(() => listProjects());
}

export function POST(req: Request) {
  return respond(async () => createProject(await readBody(req, schemas.createProjectBody)), 201);
}
