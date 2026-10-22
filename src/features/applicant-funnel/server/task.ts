import { and, eq } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { headObject } from "@/platform/r2";
import { taskSchema } from "../schemas";
import { addEvent, requireApplicant } from "./applicant";
import { ApiError } from "./errors";
import { once } from "./idempotency";
import { keyDir, MAX_TASK_FILE_BYTES } from "./uploads";

export type TaskInput = ReturnType<typeof taskSchema.parse>;
export { taskSchema };

type StageRole = "entry_new" | "entry_task";

type Finish = { didTask: boolean; taskText: string | null; taskLink: string | null; taskFileKey: string | null };

/** Sets the entry stage, marks the application completed and writes the timeline events. */
export async function finishApplication(applicantId: string, projectId: string, role: StageRole, data: Finish) {
  const [stage] = await db()
    .select({ id: tables.stages.id })
    .from(tables.stages)
    .where(and(eq(tables.stages.projectId, projectId), eq(tables.stages.role, role)));
  const now = new Date();
  await db().transaction(async (tx) => {
    await tx
      .update(tables.applicants)
      .set({ ...data, stageId: stage?.id ?? null, lastStageChangeAt: now, funnelStep: "completed", completedAt: now })
      .where(eq(tables.applicants.id, applicantId));
    await addEvent(applicantId, data.didTask ? "task_submitted" : "task_skipped", {}, tx);
    await addEvent(applicantId, "application_completed", {}, tx);
    if (stage) await addEvent(applicantId, "stage_changed", { from: null, to: stage.id }, tx);
  });
}

/** Submit or skip the optional task. Moves the applicant to the entry stage and marks the application completed. */
export function submitTask(input: TaskInput, key: string): Promise<{ stage: StageRole }> {
  return once("task", key, async () => {
    const { applicant, project } = await requireApplicant(input.resumeToken);
    if (applicant.funnelStep === "form_done") throw new ApiError(409, "video_first", "Finish the video first.");

    const submitting = !input.skip && project.taskEnabled;
    const role: StageRole = submitting ? "entry_task" : "entry_new";
    if (applicant.funnelStep === "completed") return { stage: applicant.didTask ? "entry_task" : "entry_new" };

    if (submitting) {
      if (input.text && !project.taskAllowText) throw new ApiError(400, "invalid", "Text answers are off");
      if (input.link && !project.taskAllowLink) throw new ApiError(400, "invalid", "Links are off");
      if (input.fileKey) {
        if (!project.taskAllowFile) throw new ApiError(400, "invalid", "File uploads are off");
        if (!input.fileKey.startsWith(keyDir("tasks", project.slug, applicant.id))) throw new ApiError(400, "invalid", "Wrong file key");
        const head = await headObject(input.fileKey);
        if (!head) throw new ApiError(409, "upload_missing", "We could not find your file. Please try again.");
        if (head.bytes > MAX_TASK_FILE_BYTES) throw new ApiError(400, "invalid", "File is too large");
      }
    }

    await finishApplication(applicant.id, project.id, role, {
      didTask: submitting,
      taskText: submitting ? (input.text?.trim() || null) : null,
      taskLink: submitting ? (input.link ?? null) : null,
      taskFileKey: submitting ? (input.fileKey ?? null) : null,
    });
    return { stage: role };
  });
}
