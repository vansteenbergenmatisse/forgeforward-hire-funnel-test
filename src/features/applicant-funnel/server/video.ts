import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tables } from "@/platform/db";
import { deleteObject, headObject } from "@/platform/r2";
import { requireApplicant, addEvent } from "./applicant";
import { ApiError } from "./errors";
import { finishApplication } from "./task";
import { base, keyDir, MAX_VIDEO_BYTES, VIDEO_MIMES } from "./uploads";

export const videoCompleteSchema = z.object({
  resumeToken: z.string().min(1).max(200),
  key: z.string().min(1).max(400),
  thumbKey: z.string().min(1).max(400).optional(),
  mime: z.string().min(1).max(120),
  bytes: z.number().int().positive().max(MAX_VIDEO_BYTES),
  seconds: z.number().int().min(0).max(900),
  audioOnly: z.boolean(),
  retakeUsed: z.boolean(),
});

/** Confirms the object exists in R2 with the byte count the browser reports, then saves the video fields. */
export async function completeVideo(input: z.output<typeof videoCompleteSchema>) {
  const { applicant, project } = await requireApplicant(input.resumeToken);
  // A finished application is final. A token cannot swap the video afterwards.
  if (applicant.funnelStep === "completed") {
    if (applicant.videoKey === input.key) return; // a retry of the call that finished it
    throw new ApiError(409, "already_completed", "This application is already sent.");
  }
  if (input.seconds > project.maxRecordSeconds + 10) throw new ApiError(400, "invalid", "Video is too long");
  if (!input.key.startsWith(keyDir("videos", project.slug, applicant.id))) throw new ApiError(400, "invalid", "Wrong video key");
  if (input.thumbKey && !input.thumbKey.startsWith(keyDir("thumbs", project.slug, applicant.id))) {
    throw new ApiError(400, "invalid", "Wrong thumbnail key");
  }

  const head = await headObject(input.key);
  if (!head) throw new ApiError(409, "upload_missing", "We could not find your video. Please try again.");
  if (head.bytes !== input.bytes) throw new ApiError(409, "upload_incomplete", "The upload did not finish. Please try again.");

  if (head.contentType && !VIDEO_MIMES.has(base(head.contentType))) throw new ApiError(400, "invalid", "Unsupported video type");

  // A new key on top of a saved video is a retake. The server counts it, not the browser.
  const isRetake = Boolean(applicant.videoKey) && applicant.videoKey !== input.key;
  if (isRetake && applicant.retakeUsed && project.retakesAllowed <= 1) throw new ApiError(409, "retake_limit", "You have used your retake.");
  if (isRetake && project.retakesAllowed <= 0) throw new ApiError(409, "retake_limit", "Retakes are off.");
  const retakeUsed = isRetake || applicant.retakeUsed || input.retakeUsed;

  let thumbKey: string | null = null;
  if (input.thumbKey && (await headObject(input.thumbKey))) thumbKey = input.thumbKey;

  await db().transaction(async (tx) => {
    await tx
      .update(tables.applicants)
      .set({
        videoKey: input.key,
        videoMime: input.mime.split(";")[0].trim(),
        videoBytes: head.bytes,
        videoSeconds: input.seconds,
        audioOnly: input.audioOnly,
        retakeUsed,
        thumbKey,
        // A repeat call never moves a finished application backwards.
        ...(applicant.funnelStep === "form_done" ? { funnelStep: "video_done" as const } : {}),
      })
      .where(eq(tables.applicants.id, applicant.id));
    await addEvent(applicant.id, "video_saved", { seconds: input.seconds, bytes: head.bytes, audioOnly: input.audioOnly }, tx);
  });

  // The superseded take is personal data and no row points at it any more.
  const stale = [applicant.videoKey !== input.key ? applicant.videoKey : null, applicant.thumbKey && applicant.thumbKey !== thumbKey ? applicant.thumbKey : null];
  for (const k of stale) if (k) await deleteObject(k).catch(() => {});

  // No task for this project: the application is complete once the video is saved.
  if (!project.taskEnabled) {
    await finishApplication(applicant.id, project.id, "entry_new", { didTask: false, taskText: null, taskLink: null, taskFileKey: null });
  }
}
