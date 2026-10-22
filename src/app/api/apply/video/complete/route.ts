import { completeVideo, enforceRateLimit, handle, parseBody, readJson, videoCompleteSchema } from "@/features/applicant-funnel/server";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    await enforceRateLimit(req, "video-complete", { max: 60, windowMs: 10 * 60_000 });
    await completeVideo(parseBody(videoCompleteSchema, await readJson(req)));
    return { ok: true };
  });
}
