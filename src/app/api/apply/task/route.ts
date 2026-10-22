import { handle, idempotencyKey, parseBody, readJson, submitTask, taskSchema } from "@/features/applicant-funnel/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => submitTask(parseBody(taskSchema, await readJson(req)), idempotencyKey(req)));
}
