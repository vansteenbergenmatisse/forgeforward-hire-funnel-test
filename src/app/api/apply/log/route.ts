import { handle, logClientEvent, logSchema, parseBody, readJson } from "@/features/applicant-funnel/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    await logClientEvent(parseBody(logSchema, await readJson(req)));
    return null;
  });
}
