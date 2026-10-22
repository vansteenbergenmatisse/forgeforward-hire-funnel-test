import { and, asc, eq, gt, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { deleteObject, headObject, listObjects, withPrefix } from "@/platform/r2";
import { recordSystemError } from "@/platform/logging/system-errors";
import { DEFAULT_BUDGET_MS, mapLimit } from "./budget";
import { deleteApplicant } from "@/features/applicants/server";
import { applicantFolders, isRetentionEligible, mediaKeys, ownFolders, retentionCutoff, type RetentionSubject } from "./rules";

const BATCH = 25;
const CONCURRENCY = 5;

/** Every key under the applicant's own folders: earlier takes, replaced files and uploads that were never completed. */
async function folderKeys(applicantId: string, slug: string, known: string[]): Promise<string[]> {
  const keys: string[] = [];
  // Own folders by project slug cover applicants who never stored a key (video never completed).
  const folders = new Set([...applicantFolders(applicantId, known), ...ownFolders(withPrefix(""), slug, applicantId)]);
  for (const folder of folders) {
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
  /** Applicants that were eligible and looked at in this call. */
  applicants: number;
  /** Applicants fully deleted. Always 0 in a dry run. */
  deleted: number;
  files: number;
  failed: number;
  /** False when the time budget ran out. Call again with `nextCursor`. */
  done: boolean;
  nextCursor?: string;
  sample: { applicantId: string; files: number }[];
};

const a = tables.applicants;

/** Latest stage_changed event time of the applicant. */
const lastStageEvent = sql<Date | null>`(select max(e.created_at) from applicant_events e where e.applicant_id = ${a.id} and e.type = 'stage_changed')`;

/** SQL twin of retentionClock: the latest of created, completed, last stage change and the latest stage_changed event. */
const clockSql = sql`greatest(${a.createdAt}, ${a.completedAt}, ${a.lastStageChangeAt}, ${lastStageEvent})`;

const subjectColumns = {
  id: a.id,
  videoKey: a.videoKey,
  thumbKey: a.thumbKey,
  taskFileKey: a.taskFileKey,
  createdAt: a.createdAt,
  completedAt: a.completedAt,
  lastStageChangeAt: a.lastStageChangeAt,
  lastStageEventAt: sql<string | Date | null>`${lastStageEvent}`.as("last_stage_event_at"),
  slug: tables.projects.slug,
  stageIsPositive: tables.stages.isPositive,
};

type Row = {
  id: string;
  videoKey: string | null;
  thumbKey: string | null;
  taskFileKey: string | null;
  createdAt: Date;
  completedAt: Date | null;
  lastStageChangeAt: Date | null;
  lastStageEventAt: string | Date | null;
  slug: string;
  stageIsPositive: boolean | null;
};

function subjectOf(row: Row): RetentionSubject {
  return {
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    lastStageChangeAt: row.lastStageChangeAt,
    lastStageEventAt: row.lastStageEventAt ? new Date(row.lastStageEventAt) : null,
    stageIsPositive: row.stageIsPositive,
  };
}

async function loadRow(id: string): Promise<Row | null> {
  const [row] = await db()
    .select(subjectColumns)
    .from(a)
    .innerJoin(tables.projects, eq(a.projectId, tables.projects.id))
    .leftJoin(tables.stages, eq(a.stageId, tables.stages.id))
    .where(eq(a.id, id))
    .limit(1);
  return (row as Row | undefined) ?? null;
}

/**
 * Deletes applicants completely (row, answers, events, messages, notes, R2 files) when they sit in a non-positive stage
 * or never finished, and 30 days have passed since their last stage change. Positive stages are never touched.
 * Resumable by cursor. Safe to re-run: deleted applicants are gone, and every applicant is checked again right before deletion.
 * Writes one admin_audit row per real run with counts only.
 */
export async function runRetention(opts: RunOptions = {}): Promise<RetentionResult> {
  const now = opts.now ?? new Date();
  const started = Date.now();
  const budget = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  const dryRun = Boolean(opts.dryRun);
  const result: RetentionResult = { dryRun, applicants: 0, deleted: 0, files: 0, failed: 0, done: true, sample: [] };
  let cursor = opts.after;

  try {
    for (;;) {
      if (Date.now() - started > budget) {
        result.done = false;
        result.nextCursor = cursor;
        return result;
      }
      const rows = (await db()
        .select(subjectColumns)
        .from(a)
        .innerJoin(tables.projects, eq(a.projectId, tables.projects.id))
        .leftJoin(tables.stages, eq(a.stageId, tables.stages.id))
        .where(
          and(
            or(isNull(a.stageId), eq(tables.stages.isPositive, false)),
            sql`${clockSql} < ${retentionCutoff(now).toISOString()}::timestamptz`,
            cursor ? gt(a.id, cursor) : undefined,
          ),
        )
        .orderBy(asc(a.id))
        .limit(BATCH)) as Row[];
      if (rows.length === 0) return result;

      await mapLimit(rows, CONCURRENCY, async (listed) => {
        // Check again with the current data: the applicant may have been moved since the list was read.
        const row = (await loadRow(listed.id)) ?? null;
        if (!row || !isRetentionEligible(subjectOf(row), now)) return;
        const known = mediaKeys(row);
        result.applicants += 1;
        try {
          const keys = [...new Set([...known, ...(await folderKeys(row.id, row.slug, known))])];
          result.files += keys.length;
          if (result.sample.length < 20) result.sample.push({ applicantId: row.id, files: keys.length });
          if (dryRun) return;
          for (const key of keys) await deleteObject(key);
          const out = await deleteApplicant(row.id);
          if (out.ok || out.error === "not_found") result.deleted += 1;
          else throw new Error(out.error);
        } catch (err) {
          result.failed += 1;
          await recordSystemError({
            source: "retention",
            message: "Could not delete an applicant. It will retry on the next run.",
            applicantId: row.id,
            data: { error: err instanceof Error ? err.message : "unknown" },
          });
        }
      });
      cursor = rows[rows.length - 1].id;
      if (rows.length < BATCH) return result;
    }
  } finally {
    if (!dryRun) await writeAudit(result);
  }
}

/** One row per run. Counts only, never names, emails or ids of applicants. */
async function writeAudit(r: RetentionResult): Promise<void> {
  try {
    await db().insert(tables.adminAudit).values({
      action: "retention_run",
      targetType: "system",
      detail: { eligible: r.applicants, deleted: r.deleted, files: r.files, failed: r.failed, done: r.done },
    });
  } catch {
    // The audit row must never stop a run.
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
