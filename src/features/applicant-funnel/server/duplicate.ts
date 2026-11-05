import { and, eq } from "drizzle-orm";
import { db, tables } from "@/platform/db";

/**
 * True when this phone number already finished an application for this project.
 * Only finished, real applications count: someone who quit halfway can still come back, and test applicants never block anyone.
 */
export async function hasFinishedApplication(projectId: string, phoneE164: string): Promise<boolean> {
  const [row] = await db()
    .select({ id: tables.applicants.id })
    .from(tables.applicants)
    .where(
      and(
        eq(tables.applicants.projectId, projectId),
        eq(tables.applicants.phoneE164, phoneE164),
        eq(tables.applicants.funnelStep, "completed"),
        eq(tables.applicants.isTest, false),
      ),
    )
    .limit(1);
  return Boolean(row);
}
