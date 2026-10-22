import { ApiError, handle, idempotencyKey, isHoneypot, readJson, startApplication } from "@/features/applicant-funnel/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    if (isHoneypot(body)) throw new ApiError(400, "invalid", "We could not accept this form. Reload the page and try again.");
    return startApplication(req, body, idempotencyKey(req));
  });
}
