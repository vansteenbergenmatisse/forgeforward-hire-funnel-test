import { readBody, reorderStages, respond, schemas } from "@/features/projects/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return respond(async () => {
    const body = await readBody(req, schemas.reorderBody);
    return reorderStages(body.projectSlug, body.ids);
  });
}
