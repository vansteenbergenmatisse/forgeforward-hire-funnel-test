import { and, eq, isNull, sql } from "drizzle-orm";
import { db, tables } from "@/platform/db";

type Input = {
  source: string;
  message: string;
  data?: Record<string, unknown>;
  applicantId?: string | null;
};

/**
 * Writes a system_errors row. A job that fails every night would otherwise stack identical rows,
 * so an unresolved row with the same source, message and applicant is reused. Returns true if a new row was written.
 */
export async function recordSystemError(input: Input): Promise<boolean> {
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
  await db().insert(tables.systemErrors).values({
    source: input.source,
    message: input.message,
    data: input.data ?? {},
    applicantId,
  });
  return true;
}
