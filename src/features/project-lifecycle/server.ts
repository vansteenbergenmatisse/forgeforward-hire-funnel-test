import { and, asc, eq, inArray, notExists, sql } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { deleteObject, listObjects, withPrefix } from "@/platform/r2";
import { recordAudit } from "@/features/admin-access/server";
import { deleteApplicant } from "@/features/applicants/server";
import { DEFAULT_BUDGET_MS, mapLimit } from "@/features/retention";
import { ApiError } from "@/features/projects/server";
import type { DeletionCounts, DeletionPreview, DeletionResult } from "./types";

const T = tables;
const BATCH = 25;
const CONCURRENCY = 5;
const SLUG_OK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FOLDER_KINDS = ["videos", "thumbs", "tasks"] as const;

const zero = (): DeletionCounts => ({ applicants: 0, files: 0, stages: 0, questions: 0, templates: 0, messages: 0 });

async function projectRow(slug: string) {
  const [row] = await db().select({ id: T.projects.id, slug: T.projects.slug, name: T.projects.name, status: T.projects.status }).from(T.projects).where(eq(T.projects.slug, slug)).limit(1);
  return row ?? null;
}

async function countsFor(projectId: string): Promise<DeletionCounts> {
  const a = T.applicants;
  const [r] = await db()
    .select({
      applicants: sql<number>`count(*)::int`,
      files: sql<number>`(count(${a.videoKey}) + count(${a.thumbKey}) + count(${a.taskFileKey}))::int`,
      messages: sql<number>`(select count(*) from messages m join applicants x on x.id = m.applicant_id where x.project_id = ${projectId})::int`,
      stages: sql<number>`(select count(*) from stages where project_id = ${projectId})::int`,
      questions: sql<number>`(select count(*) from project_questions where project_id = ${projectId})::int`,
      templates: sql<number>`(select count(*) from message_templates where project_id = ${projectId})::int`,
    })
    .from(a)
    .where(eq(a.projectId, projectId));
  return r ?? zero();
}

/** Live counts for the confirmation dialog. Never changes anything. */
export async function previewProjectDeletion(slug: string): Promise<DeletionPreview> {
  const row = await projectRow(slug);
  if (!row) throw new ApiError(404, "not_found", "Project not found.");
  return { slug: row.slug, name: row.name, deleting: row.status === "deleting", counts: await countsFor(row.id) };
}

/** Pages through a prefix. `onPage` returns false to pause; that only matters while more pages remain. Returns true when the prefix is empty. */
async function listAll(prefix: string, onPage: (keys: string[]) => Promise<boolean>): Promise<boolean> {
  for (;;) {
    // Deleted keys leave the listing, so the first page is read again each round and no continuation token is needed.
    const page = await listObjects(prefix);
    if (page.objects.length === 0) return true;
    if (!(await onPage(page.objects.map((o) => o.key)))) return false;
  }
}

/** Unmatched Cal.com bookings of the removed people, unless the same email also applied to another project. */
async function dropUnmatchedBookings(emails: string[]) {
  const unique = [...new Set(emails.map((e) => e.toLowerCase()))];
  if (unique.length === 0) return;
  const a = T.applicants;
  await db()
    .delete(T.unmatchedBookings)
    .where(
      and(
        inArray(sql`lower(${T.unmatchedBookings.attendeeEmail})`, unique),
        notExists(db().select({ one: sql`1` }).from(a).where(sql`lower(${a.email}) = lower(${T.unmatchedBookings.attendeeEmail})`)),
      ),
    );
}

/**
 * Deletes a project completely and only that project: its applicants (answers, events, messages, notes, R2 files, system errors),
 * the leftover R2 folders under its slug, stages, questions, templates and settings.
 *
 * First it marks the project "deleting", which hides it from every list and from the public link. Then it works in batches
 * inside a time budget. When the budget runs out (or a file cannot be deleted) it returns `done: false`; calling again, or the
 * nightly retention cron, continues where it stopped. A project that is already gone returns `found: false` and is a no-op.
 * Writes admin_audit rows with counts only.
 */
export async function deleteProject(slug: string, opts: { budgetMs?: number } = {}): Promise<DeletionResult> {
  if (!SLUG_OK.test(slug)) throw new ApiError(400, "invalid", "Bad project slug.");
  const started = Date.now();
  const budget = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  const out = (): boolean => Date.now() - started > budget;
  const removed = { applicants: 0, files: 0 };
  let failed = 0;

  const row = await projectRow(slug);
  if (!row) return { done: true, found: false, removed, failed, remaining: null };

  if (row.status !== "deleting") {
    // Flip once. If two calls race, only the one that changed the row writes the "requested" audit row.
    const flipped = await db().update(T.projects).set({ status: "deleting" }).where(and(eq(T.projects.id, row.id), sql`${T.projects.status} <> 'deleting'`)).returning({ id: T.projects.id });
    if (flipped.length) await recordAudit({ action: "project.delete_requested", targetType: "project", targetId: slug, detail: { ...(await countsFor(row.id)) } });
  }

  // A zero budget only marks the project. Otherwise every call does at least one batch, so a tiny budget still makes progress.
  if (budget <= 0) return finish(false);

  // 1. Applicants, a batch at a time. deleteApplicant removes the applicant's R2 files first and keeps the row if a file fails.
  for (let round = 0; ; round++) {
    if (round > 0 && out()) return finish(false);
    const batch = await db().select({ id: T.applicants.id, email: T.applicants.email }).from(T.applicants).where(eq(T.applicants.projectId, row.id)).orderBy(asc(T.applicants.id)).limit(BATCH);
    if (batch.length === 0) break;
    let progress = 0;
    await mapLimit(batch, CONCURRENCY, async (b) => {
      const res = await deleteApplicant(b.id);
      if (res.ok || res.error === "not_found") {
        progress += 1;
        if (res.ok) removed.applicants += 1;
      } else failed += 1;
    });
    await dropUnmatchedBookings(batch.map((b) => b.email));
    // No applicant could be removed: stop instead of looping. The next call retries.
    if (progress === 0) return finish(false);
  }

  // 2. R2 folders under the project slug (uploads that never reached an applicant row, files of renamed slugs are covered above).
  for (const kind of FOLDER_KINDS) {
    const done = await listAll(withPrefix(`${kind}/${slug}/`), async (keys) => {
      await mapLimit(keys, 10, async (key) => {
        try {
          await deleteObject(key);
          removed.files += 1;
        } catch {
          failed += 1;
        }
      });
      return !out() && failed === 0;
    });
    if (!done) return finish(false);
  }

  // 3. The project row. Stages, questions and templates cascade.
  await db().delete(T.projects).where(and(eq(T.projects.id, row.id), eq(T.projects.status, "deleting")));
  return finish(true);

  async function finish(done: boolean): Promise<DeletionResult> {
    const remaining = done ? null : await countsFor(row!.id);
    if (done) await recordAudit({ action: "project.delete", targetType: "project", targetId: slug, detail: { applicants: removed.applicants, files: removed.files, failed } });
    return { done, found: true, removed, failed, remaining };
  }
}

/** Finishes every project left in "deleting". Called by the nightly retention cron and after the Projects list loads. */
export async function finishPendingDeletions(opts: { budgetMs?: number } = {}): Promise<{ projects: number; done: number }> {
  const started = Date.now();
  const budget = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  const rows = await db().select({ slug: T.projects.slug }).from(T.projects).where(eq(T.projects.status, "deleting")).orderBy(asc(T.projects.createdAt));
  let done = 0;
  for (const r of rows) {
    const left = budget - (Date.now() - started);
    if (left <= 0) break;
    if ((await deleteProject(r.slug, { budgetMs: left })).done) done += 1;
  }
  return { projects: rows.length, done };
}

export async function hasPendingDeletions(): Promise<boolean> {
  const [r] = await db().select({ id: T.projects.id }).from(T.projects).where(eq(T.projects.status, "deleting")).limit(1);
  return Boolean(r);
}
