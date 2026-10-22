import { enforceRateLimit, handle, idempotencyKey, parseBody, readJson, submitTask, taskSchema } from "@/features/applicant-funnel/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    await enforceRateLimit(req, "task", { max: 60, windowMs: 10 * 60_000 });
    return submitTask(parseBody(taskSchema, await readJson(req)), idempotencyKey(req));
  });
}
