import { randomBytes } from "node:crypto";
import { z } from "zod";
import { signedPutUrl, withPrefix } from "@/platform/r2";
import type { UploadUrls } from "../types";
import { requireApplicant } from "./applicant";
import { ApiError } from "./errors";

export const MAX_TASK_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime", "audio/mp4", "audio/webm", "audio/ogg", "audio/mpeg"]);
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
});

const base = (mime: string) => mime.split(";")[0].trim().toLowerCase();

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
  const stamp = Date.now();

  if (input.kind === "video") {
    if (!VIDEO_MIMES.has(base(input.mime))) throw new ApiError(400, "invalid", "Unsupported video type");
    const key = `${keyDir("videos", project.slug, applicant.id)}${stamp}.${extFor(input.mime)}`;
    const putUrl = await signedPutUrl(key, input.mime);
    if (!input.withThumb) return { key, putUrl };
    const thumbKey = `${keyDir("thumbs", project.slug, applicant.id)}${stamp}.jpg`;
    return { key, putUrl, thumbKey, thumbPutUrl: await signedPutUrl(thumbKey, "image/jpeg") };
  }

  if (!project.taskEnabled || !project.taskAllowFile) throw new ApiError(403, "file_not_allowed");
  if (!TASK_MIMES.has(base(input.mime))) throw new ApiError(400, "invalid", "Unsupported file type");
  const key = `${keyDir("tasks", project.slug, applicant.id)}${randomBytes(4).toString("hex")}-${safeFilename(input.filename)}`;
  return { key, putUrl: await signedPutUrl(key, input.mime) };
}

