import { eq } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { deleteObject, listObjects, signedGetUrl } from "@/platform/r2";
import type { ApplicantView } from "../types";
import { getApplicant } from "./queries";

const { applicants, applicantEvents, stages } = tables;

export type CommandResult<T = ApplicantView> = { ok: true; value: T } | { ok: false; error: "not_found" | "bad_stage" };

async function load(id: string) {
  const [row] = await db().select().from(applicants).where(eq(applicants.id, id)).limit(1);
  return row ?? null;
}

async function fresh(id: string): Promise<CommandResult> {
  const v = await getApplicant(id);
  return v ? { ok: true, value: v } : { ok: false, error: "not_found" };
}

/** Moves a card (or puts a "Did not finish" card on the board). Writes stage_changed with from and to. */
export async function moveStage(id: string, stageId: string, now: Date = new Date()): Promise<CommandResult> {
  const row = await load(id);
  if (!row) return { ok: false, error: "not_found" };
  const [stage] = await db().select().from(stages).where(eq(stages.id, stageId)).limit(1);
  if (!stage || stage.projectId !== row.projectId) return { ok: false, error: "bad_stage" };
  if (row.stageId !== stageId) {
    await db().transaction(async (tx) => {
      await tx.update(applicants).set({ stageId, lastStageChangeAt: now }).where(eq(applicants.id, id));
      await tx.insert(applicantEvents).values({
        applicantId: id,
        type: "stage_changed",
        data: { from: row.stageId, to: stageId },
        createdAt: now,
      });
    });
  }
  return fresh(id);
}

export async function setScore(id: string, score: number | null): Promise<CommandResult> {
  const rows = await db().update(applicants).set({ score }).where(eq(applicants.id, id)).returning({ id: applicants.id });
  return rows.length ? fresh(id) : { ok: false, error: "not_found" };
}

export async function setNotes(id: string, notes: string): Promise<CommandResult> {
  const rows = await db().update(applicants).set({ notes }).where(eq(applicants.id, id)).returning({ id: applicants.id });
  return rows.length ? fresh(id) : { ok: false, error: "not_found" };
}

export async function markRead(id: string): Promise<CommandResult> {
  const rows = await db()
    .update(applicants)
    .set({ unreadReply: false })
    .where(eq(applicants.id, id))
    .returning({ id: applicants.id });
  return rows.length ? fresh(id) : { ok: false, error: "not_found" };
}

/** R2 keys that belong to an applicant. */
export function r2KeysOf(row: { videoKey: string | null; thumbKey: string | null; taskFileKey: string | null }): string[] {
  return [row.videoKey, row.thumbKey, row.taskFileKey].filter((k): k is string => Boolean(k));
}

/**
 * Keys of every file under the applicant's own R2 folders (earlier takes, replaced files). A folder counts only when
 * its last segment is the applicant id, so a wrong key can never widen the delete to someone else's files.
 */
export async function strayApplicantKeys(
  id: string,
  row: { videoKey: string | null; thumbKey: string | null; taskFileKey: string | null },
  list: (prefix: string) => Promise<string[]> = listAll,
): Promise<string[]> {
  const folders = new Set<string>();
  for (const key of r2KeysOf(row)) {
    const folder = key.slice(0, key.lastIndexOf("/") + 1);
    if (folder.endsWith(`/${id}/`)) folders.add(folder);
  }
  const known = new Set(r2KeysOf(row));
  const found: string[] = [];
  for (const folder of folders) for (const key of await list(folder)) if (!known.has(key)) found.push(key);
  return found;
}

async function listAll(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await listObjects(prefix, { token });
    keys.push(...page.objects.map((o) => o.key));
    token = page.next;
  } while (token);
  return keys;
}

/**
 * Deletes an applicant. R2 files go first: if a delete fails we keep the row so nothing is orphaned,
 * and the caller gets `files_failed`. Events and messages cascade in the database. System errors and "applied before" links to it are cleared too.
 */
export async function deleteApplicant(
  id: string,
  remove: (key: string) => Promise<void> = deleteObject,
  list?: (prefix: string) => Promise<string[]>,
): Promise<{ ok: true } | { ok: false; error: "not_found" | "files_failed" }> {
  const row = await load(id);
  if (!row) return { ok: false, error: "not_found" };
  try {
    for (const key of [...r2KeysOf(row), ...(await strayApplicantKeys(id, row, list))]) await remove(key);
  } catch {
    return { ok: false, error: "files_failed" };
  }
  await db().delete(applicants).where(eq(applicants.id, id));
  // Rows without a foreign key that still point at the applicant.
  await db().delete(tables.systemErrors).where(eq(tables.systemErrors.applicantId, id));
  await db().update(applicants).set({ previousApplicantId: null }).where(eq(applicants.previousApplicantId, id));
  return { ok: true };
}

export type MediaKind = "video" | "thumb" | "task";

/**
 * Signed GET URL for the player, the thumbnail or the task file. Short-lived: it works without the admin cookie.
 * Long enough for a review session, because seeking asks R2 again with the same URL.
 */
export const ADMIN_MEDIA_TTL_SECONDS = 900;

export async function signedMediaUrl(
  id: string,
  kind: MediaKind,
  expiresIn = ADMIN_MEDIA_TTL_SECONDS,
): Promise<{ url: string; expiresIn: number } | null> {
  const row = await load(id);
  if (!row) return null;
  // Retention removes the video, thumbnail and task file together, so nothing is signed once it ran.
  if (row.videoDeletedAt) return null;
  const key = kind === "video" ? row.videoKey : kind === "thumb" ? row.thumbKey : row.taskFileKey;
  if (!key) return null;
  // Only the task file is a download. Video and thumbnail stay inline so the player and <img> work.
  const downloadName = kind === "task" ? (row.taskFileName ?? "task-file") : undefined;
  return { url: await signedGetUrl(key, expiresIn, downloadName), expiresIn };
}
