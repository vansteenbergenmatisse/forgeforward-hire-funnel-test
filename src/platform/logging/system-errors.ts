import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db, tables } from "@/platform/db";

type Input = {
  source: string;
  message: string;
  data?: Record<string, unknown>;
  applicantId?: string | null;
};

const MAX_SOURCE = 64;
const MAX_MESSAGE = 300;
/** New rows allowed per hour across all sources. Beyond this the alert list already shows a flood. */
export const MAX_NEW_ROWS_PER_HOUR = 200;

/** Source is a short machine label: lowercase letters, digits and . _ : - only. */
export function cleanSource(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9._:-]+/g, "_").slice(0, MAX_SOURCE) || "unknown";
}

/** One line of plain text. Control characters and line breaks are removed so text cannot fake a second alert. */
export function cleanMessage(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE) || "(empty)";
}

/**
 * Writes a system_errors row. A job that fails every night would otherwise stack identical rows,
 * so an unresolved row with the same source, message and applicant is reused. Returns true if a new row was written.
 */
export async function recordSystemError(raw: Input): Promise<boolean> {
  const input = { ...raw, source: cleanSource(raw.source), message: cleanMessage(raw.message) };
  const applicantId = input.applicantId ?? null;
  const existing = await db()
    .select({ id: tables.systemErrors.id })
    .from(tables.systemErrors)
    .where(
      and(
        eq(tables.systemErrors.source, input.source),
        eq(tables.systemErrors.message, input.message),
        isNull(tables.systemErrors.resolvedAt),
        applicantId ? eq(tables.systemErrors.applicantId, applicantId) : isNull(tables.systemErrors.applicantId),
        input.data?.key ? sql`${tables.systemErrors.data}->>'key' = ${String(input.data.key)}` : undefined,
      ),
    )
    .limit(1);
  if (existing.length) return false;
  const [recent] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(tables.systemErrors)
    .where(gte(tables.systemErrors.createdAt, new Date(Date.now() - 3_600_000)));
  if ((recent?.n ?? 0) >= MAX_NEW_ROWS_PER_HOUR) return false;
  await db().insert(tables.systemErrors).values({
    source: input.source,
    message: input.message,
    data: input.data ?? {},
    applicantId,
  });
  return true;
}
