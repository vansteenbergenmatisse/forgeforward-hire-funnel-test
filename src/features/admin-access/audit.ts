import { db } from "@/platform/db";
import { adminAudit } from "@/platform/db/schema";

export type AuditEntry = {
  action: string;
  targetType: string;
  targetId?: string | null;
  /** Ids, field names and counts only. Never applicant values (names, email, phone, notes, message text). */
  detail?: Record<string, unknown>;
};

/** Writes one audit row. A failed write is logged without data and never blocks the admin action. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db().insert(adminAudit).values({
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      detail: entry.detail ?? {},
    });
  } catch (e) {
    console.error("admin audit write failed", e instanceof Error ? e.name : "unknown");
  }
}
