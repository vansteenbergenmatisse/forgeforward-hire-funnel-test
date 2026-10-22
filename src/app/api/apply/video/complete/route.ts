import { completeVideo, handle, parseBody, readJson, videoCompleteSchema } from "@/features/applicant-funnel/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    await completeVideo(parseBody(videoCompleteSchema, await readJson(req)));
    return { ok: true };
  });
}
