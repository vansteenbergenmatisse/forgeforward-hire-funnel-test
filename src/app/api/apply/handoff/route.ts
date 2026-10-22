import { z } from "zod";
import { createHandoff, enforceRateLimit, handle, parseBody, readJson } from "@/features/applicant-funnel/server";

export const dynamic = "force-dynamic";

const schema = z.object({ resumeToken: z.string().min(1).max(200) });

export function POST(req: Request) {
  return handle(async () => {
    await enforceRateLimit(req, "handoff", { max: 20, windowMs: 10 * 60_000 });
    return createHandoff(parseBody(schema, await readJson(req)).resumeToken);
  });
}
