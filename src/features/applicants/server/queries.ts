import { and, desc, eq, ilike, inArray, isNotNull, isNull, or, type SQL } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import type { ApplicantView } from "../types";
import { toApplicantView } from "./map";

const { applicants, applicantEvents, messages, projects } = tables;

export type ApplicantListFilter = {
  projectSlug?: string;
  stageId?: string;
  /** completed = on the board, dnf = "Did not finish". */
  step?: "completed" | "dnf";
  unread?: boolean;
  q?: string;
  includeTest?: boolean;
  limit?: number;
  /** false = list rows without events and messages (the board does not need them). Default true. */
  detail?: boolean;
};

export const DEFAULT_LIST_LIMIT = 2000;
export const MAX_LIST_LIMIT = 5000;

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function hydrate(rows: { a: typeof applicants.$inferSelect; slug: string }[], detail = true): Promise<ApplicantView[]> {
  if (rows.length === 0) return [];
  if (!detail) return rows.map(({ a, slug }) => toApplicantView(a, slug, [], [], false));
  const ids = rows.map((r) => r.a.id);
  const [events, msgs] = await Promise.all([
    db().select().from(applicantEvents).where(inArray(applicantEvents.applicantId, ids)),
    db().select().from(messages).where(inArray(messages.applicantId, ids)),
  ]);
  return rows.map(({ a, slug }) =>
    toApplicantView(
      a,
      slug,
      events.filter((e) => e.applicantId === a.id),
      msgs.filter((m) => m.applicantId === a.id),
    ),
  );
}

export async function listApplicants(f: ApplicantListFilter = {}): Promise<ApplicantView[]> {
  return (await listApplicantsPage(f)).applicants;
}

/** Newest first. `truncated` is true when more applicants match than the limit allows. */
export async function listApplicantsPage(f: ApplicantListFilter = {}): Promise<{ applicants: ApplicantView[]; truncated: boolean }> {
  const limit = Math.min(f.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
  const where: SQL[] = [];
  if (f.projectSlug) where.push(eq(projects.slug, f.projectSlug));
  if (f.stageId) where.push(eq(applicants.stageId, f.stageId));
  if (f.step === "completed") where.push(isNotNull(applicants.stageId));
  if (f.step === "dnf") where.push(isNull(applicants.stageId));
  if (f.unread) where.push(eq(applicants.unreadReply, true));
  if (f.includeTest === false) where.push(eq(applicants.isTest, false));
  if (f.q) {
    const like = `%${escapeLike(f.q)}%`;
    const match = or(
      ilike(applicants.firstName, like),
      ilike(applicants.lastName, like),
      ilike(applicants.email, like),
      ilike(applicants.phoneE164, like),
    );
    if (match) where.push(match);
  }
  const rows = await db()
    .select({ a: applicants, slug: projects.slug })
    .from(applicants)
    .innerJoin(projects, eq(projects.id, applicants.projectId))
    .where(and(...where))
    .orderBy(desc(applicants.createdAt))
    .limit(limit + 1);
  const truncated = rows.length > limit;
  return { applicants: await hydrate(rows.slice(0, limit), f.detail !== false), truncated };
}

export async function getApplicant(id: string): Promise<ApplicantView | null> {
  const rows = await db()
    .select({ a: applicants, slug: projects.slug })
    .from(applicants)
    .innerJoin(projects, eq(projects.id, applicants.projectId))
    .where(eq(applicants.id, id))
    .limit(1);
  return (await hydrate(rows))[0] ?? null;
}
