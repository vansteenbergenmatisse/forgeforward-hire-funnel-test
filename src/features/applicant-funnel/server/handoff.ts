import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { env } from "@/shared/env";
import { addEvent, requireApplicant } from "./applicant";
import { ApiError } from "./errors";

const TTL_MS = 24 * 60 * 60_000;

export async function createHandoff(resumeToken: string) {
  const { applicant, project } = await requireApplicant(resumeToken);
  if (!project.handoffEnabled) throw new ApiError(403, "handoff_off");
  const token = randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + TTL_MS);
  await db()
    .update(tables.applicants)
    .set({ handoffToken: token, handoffExpiresAt: expires })
    .where(eq(tables.applicants.id, applicant.id));
  return { url: `${env().APP_URL.replace(/\/$/, "")}/a/handoff/${token}`, expiresAt: expires.toISOString() };
}

/** One-time use: the token is cleared in the same statement that finds it. Returns null when unknown, used or expired. */
export async function consumeHandoff(token: string) {
  if (!token || token.length > 200) return null;
  const rows = await db()
    .update(tables.applicants)
    .set({ handoffToken: null, handoffExpiresAt: null })
    .where(and(eq(tables.applicants.handoffToken, token), gt(tables.applicants.handoffExpiresAt, new Date())))
    .returning({
      id: tables.applicants.id,
      resumeToken: tables.applicants.resumeToken,
      firstName: tables.applicants.firstName,
      projectId: tables.applicants.projectId,
      funnelStep: tables.applicants.funnelStep,
    });
  const row = rows[0];
  if (!row) return null;
  await addEvent(row.id, "handoff_used");
  const [project] = await db().select({ slug: tables.projects.slug }).from(tables.projects).where(eq(tables.projects.id, row.projectId));
  return { slug: project.slug, resumeToken: row.resumeToken, applicantId: row.id, firstName: row.firstName, funnelStep: row.funnelStep };
}
