import { and, asc, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { deleteObject, headObject, listObjects } from "@/platform/r2";
import { recordSystemError } from "@/platform/logging/system-errors";
import { DEFAULT_BUDGET_MS, mapLimit } from "./budget";
import { applicantFolders, mediaKeys, retentionCutoff } from "./rules";

const BATCH = 25;
const CONCURRENCY = 5;

/** Every key under the applicant's own folders: earlier takes, replaced files and uploads that were never completed. */
async function folderKeys(applicantId: string, known: string[]): Promise<string[]> {
  const keys: string[] = [];
  for (const folder of applicantFolders(applicantId, known)) {
    let token: string | undefined;
    do {
      const page = await listObjects(folder, { token });
      keys.push(...page.objects.map((o) => o.key));
      token = page.next;
    } while (token);
  }
  return keys;
}

export type RunOptions = {
  dryRun?: boolean;
  /** Applicant id to continue after. Work is ordered by id. */
  after?: string;
  budgetMs?: number;
  now?: Date;
};

export type RetentionResult = {
  dryRun: boolean;
  applicants: number;
  files: number;
  failed: number;
  /** False when the time budget ran out. Call again with `nextCursor`. */
  done: boolean;
  nextCursor?: string;
  sample: { applicantId: string; files: number }[];
};

/** Deletes media of applicants older than 30 days that are not in a positive stage. Resumable by cursor. */
export async function runRetention(opts: RunOptions = {}): Promise<RetentionResult> {
  const now = opts.now ?? new Date();
  const started = Date.now();
  const budget = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  const dryRun = Boolean(opts.dryRun);
  const a = tables.applicants;
  const result: RetentionResult = { dryRun, applicants: 0, files: 0, failed: 0, done: true, sample: [] };
  let cursor = opts.after;

  for (;;) {
    if (Date.now() - started > budget) {
      result.done = false;
      result.nextCursor = cursor;
      return result;
    }
    const rows = await db()
      .select({
        id: a.id,
        videoKey: a.videoKey,
        thumbKey: a.thumbKey,
        taskFileKey: a.taskFileKey,
      })
      .from(a)
      .leftJoin(tables.stages, eq(a.stageId, tables.stages.id))
      .where(
        and(
          lt(a.createdAt, retentionCutoff(now)),
          isNull(a.videoDeletedAt),
          or(isNotNull(a.videoKey), isNotNull(a.thumbKey), isNotNull(a.taskFileKey)),
          or(isNull(a.stageId), eq(tables.stages.isPositive, false)),
          cursor ? gt(a.id, cursor) : undefined,
        ),
      )
      .orderBy(asc(a.id))
      .limit(BATCH);
    if (rows.length === 0) return result;

    await mapLimit(rows, CONCURRENCY, async (row) => {
      const known = mediaKeys(row);
      result.applicants += 1;
      try {
        const keys = [...new Set([...known, ...(await folderKeys(row.id, known))])];
        result.files += keys.length;
        if (result.sample.length < 20) result.sample.push({ applicantId: row.id, files: keys.length });
        if (dryRun) return;
        for (const key of keys) await deleteObject(key);
        await db().update(a).set({ videoDeletedAt: new Date() }).where(eq(a.id, row.id));
        await db().insert(tables.applicantEvents).values({
          applicantId: row.id,
          type: "media_deleted",
          data: { files: keys.length },
        });
      } catch (err) {
        result.failed += 1;
        await recordSystemError({
          source: "retention",
          message: "Could not delete media. It will retry on the next run.",
          applicantId: row.id,
          data: { error: err instanceof Error ? err.message : "unknown" },
        });
      }
    });
    cursor = rows[rows.length - 1].id;
    if (rows.length < BATCH) return result;
  }
}

export type IntegrityResult = {
  checked: number;
  missing: number;
  errors: number;
  done: boolean;
  nextCursor?: string;
  sample: { applicantId: string; key: string }[];
};

/** HEADs every video and thumbnail key that should still exist. Missing files go to system_errors. Resumable by cursor. */
export async function runIntegrity(opts: { dryRun?: boolean; after?: string; budgetMs?: number } = {}): Promise<IntegrityResult> {
  const started = Date.now();
  const budget = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  const a = tables.applicants;
  const result: IntegrityResult = { checked: 0, missing: 0, errors: 0, done: true, sample: [] };
  let cursor = opts.after;

  for (;;) {
    if (Date.now() - started > budget) {
      result.done = false;
      result.nextCursor = cursor;
      return result;
    }
    const rows = await db()
      .select({ id: a.id, videoKey: a.videoKey, thumbKey: a.thumbKey })
      .from(a)
      .where(
        and(
          isNull(a.videoDeletedAt),
          or(isNotNull(a.videoKey), isNotNull(a.thumbKey)),
          cursor ? gt(a.id, cursor) : undefined,
        ),
      )
      .orderBy(asc(a.id))
      .limit(BATCH * 2);
    if (rows.length === 0) break;

    const jobs = rows.flatMap((r) =>
      [r.videoKey, r.thumbKey].filter((k): k is string => Boolean(k)).map((key) => ({ applicantId: r.id, key })),
    );
    await mapLimit(jobs, 10, async (job) => {
      result.checked += 1;
      try {
        if (await headObject(job.key)) return;
        result.missing += 1;
        if (result.sample.length < 20) result.sample.push(job);
        if (!opts.dryRun) {
          await recordSystemError({
            source: "integrity",
            message: "A video or thumbnail file is missing from storage.",
            applicantId: job.applicantId,
            data: { key: job.key },
          });
        }
      } catch {
        result.errors += 1;
      }
    });
    cursor = rows[rows.length - 1].id;
    if (rows.length < BATCH * 2) break;
  }
  if (result.errors > 0 && !opts.dryRun) {
    await recordSystemError({
      source: "integrity",
      message: "Some files could not be checked. Storage may be unreachable.",
    });
  }
  return result;
}
