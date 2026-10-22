import { createUploadUrls, handle, parseBody, readJson, uploadUrlSchema } from "@/features/applicant-funnel/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => createUploadUrls(parseBody(uploadUrlSchema, await readJson(req))));
}
