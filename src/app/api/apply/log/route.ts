import { enforceRateLimit, handle, logClientEvent, logSchema, parseBody, readJson } from "@/features/applicant-funnel/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    await enforceRateLimit(req, "log", { max: 30, windowMs: 10 * 60_000 });
    await logClientEvent(parseBody(logSchema, await readJson(req)));
    return null;
  });
}
