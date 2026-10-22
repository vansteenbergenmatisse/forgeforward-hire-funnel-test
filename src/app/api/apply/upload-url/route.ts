import { createUploadUrls, enforceRateLimit, handle, parseBody, readJson, uploadUrlSchema } from "@/features/applicant-funnel/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    await enforceRateLimit(req, "upload-url", { max: 60, windowMs: 10 * 60_000 });
    return createUploadUrls(parseBody(uploadUrlSchema, await readJson(req)));
  });
}
