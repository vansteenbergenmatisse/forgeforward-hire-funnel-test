import { z } from "zod";
import { createHandoff, handle, parseBody, readJson } from "@/features/applicant-funnel/server";

export const dynamic = "force-dynamic";

const schema = z.object({ resumeToken: z.string().min(1).max(200) });

export function POST(req: Request) {
  return handle(async () => createHandoff(parseBody(schema, await readJson(req)).resumeToken));
}
