import { eq } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { ApiError } from "./errors";

/** Applicant plus its project, found by resume token. Throws 404 for an unknown token. */
export async function requireApplicant(resumeToken: string) {
  const [row] = await db()
    .select({ applicant: tables.applicants, project: tables.projects })
    .from(tables.applicants)
    .innerJoin(tables.projects, eq(tables.projects.id, tables.applicants.projectId))
    .where(eq(tables.applicants.resumeToken, resumeToken));
  if (!row) throw new ApiError(404, "not_found");
  return row;
}

export async function addEvent(applicantId: string, type: string, data: Record<string, unknown> = {}, tx: Pick<ReturnType<typeof db>, "insert"> = db()) {
  await tx.insert(tables.applicantEvents).values({ applicantId, type, data });
}
