import { randomBytes } from "node:crypto";
import { z } from "zod";
import { signedPutUrl, withPrefix } from "@/platform/r2";
import { takeRateLimit } from "@/shared/rate-limit";
import type { UploadUrls } from "../types";
import { requireApplicant } from "./applicant";
import { ApiError } from "./errors";
import { limitStore } from "./rate-limit";

export const MAX_TASK_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
export const MAX_THUMB_BYTES = 2 * 1024 * 1024;

export const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime", "audio/mp4", "audio/webm", "audio/ogg", "audio/mpeg"]);
const TASK_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/octet-stream",
]);

export const uploadUrlSchema = z.object({
  resumeToken: z.string().min(1).max(200),
  kind: z.enum(["video", "task"]),
  mime: z.string().min(1).max(120).regex(/^[\w.+-]+\/[\w.+-]+(;\s?[\w=.,+-]+)*$/),
  filename: z.string().max(200).optional(),
  withThumb: z.boolean().default(false),
  /** Size of the file about to be sent. It is signed into the upload link, so R2 refuses any other size. */
  bytes: z.number().int().positive(),
  thumbBytes: z.number().int().positive().optional(),
});

export const base = (mime: string) => mime.split(";")[0].trim().toLowerCase();

function extFor(mime: string) {
  const b = base(mime);
  if (b.endsWith("mp4")) return b.startsWith("audio") ? "m4a" : "mp4";
  if (b === "video/quicktime") return "mov";
  if (b === "audio/ogg") return "ogg";
  if (b === "audio/mpeg") return "mp3";
  return "webm";
}

export function safeFilename(name: string | undefined): string {
  const cleaned = (name ?? "file").replace(/[^\w.-]+/g, "_").replace(/^\.+/, "").slice(-80);
  return cleaned || "file";
}

/** Folder in R2 owned by one applicant. Stored keys include the environment prefix. */
export function keyDir(kind: "videos" | "thumbs" | "tasks", slug: string, applicantId: string) {
  return withPrefix(`${kind}/${slug}/${applicantId}/`);
}

export async function createUploadUrls(input: z.output<typeof uploadUrlSchema>): Promise<UploadUrls> {
  const { applicant, project } = await requireApplicant(input.resumeToken);
  // Each call signs fresh keys. A cap per applicant stops one token from filling storage.
  if (!(await takeRateLimit(limitStore(), `upload:${applicant.id}`, { max: 20, windowMs: 10 * 60_000 }))) {
    throw new ApiError(429, "rate_limited", "Too many uploads. Wait a few minutes and try again.");
  }
  const stamp = Date.now();

  if (input.kind === "video") {
    if (!VIDEO_MIMES.has(base(input.mime))) throw new ApiError(400, "invalid", "Unsupported video type");
    if (input.bytes > MAX_VIDEO_BYTES) throw new ApiError(400, "too_large", "That video is too large.");
    const key = `${keyDir("videos", project.slug, applicant.id)}${stamp}.${extFor(input.mime)}`;
    const putUrl = await signedPutUrl(key, input.mime, { contentLength: input.bytes });
    if (!input.withThumb) return { key, putUrl };
    if (!input.thumbBytes || input.thumbBytes > MAX_THUMB_BYTES) throw new ApiError(400, "invalid", "Unsupported thumbnail size");
    const thumbKey = `${keyDir("thumbs", project.slug, applicant.id)}${stamp}.jpg`;
    return { key, putUrl, thumbKey, thumbPutUrl: await signedPutUrl(thumbKey, "image/jpeg", { contentLength: input.thumbBytes }) };
  }

  if (!project.taskEnabled || !project.taskAllowFile) throw new ApiError(403, "file_not_allowed");
  if (!TASK_MIMES.has(base(input.mime))) throw new ApiError(400, "invalid", "Unsupported file type");
  if (input.bytes > MAX_TASK_FILE_BYTES) throw new ApiError(400, "too_large", "That file is too large.");
  const key = `${keyDir("tasks", project.slug, applicant.id)}${randomBytes(4).toString("hex")}-${safeFilename(input.filename)}`;
  return { key, putUrl: await signedPutUrl(key, input.mime, { contentLength: input.bytes }) };
}

