import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { env } from "@/shared/env";
import { takeRateLimit } from "@/shared/rate-limit";
import { addEvent, requireApplicant } from "./applicant";
import { ApiError } from "./errors";
import { limitStore } from "./rate-limit";

const TTL_MS = 30 * 60_000;
const ISSUE_RULE = { max: 5, windowMs: 10 * 60_000 };

/** Only this hash is stored, so a database read does not give out a live link. */
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createHandoff(resumeToken: string) {
  const { applicant, project } = await requireApplicant(resumeToken);
  if (!project.handoffEnabled) throw new ApiError(403, "handoff_off");
  if (!(await takeRateLimit(limitStore(), `handoff:${applicant.id}`, ISSUE_RULE))) {
    throw new ApiError(429, "rate_limited", "Too many links. Wait a few minutes and try again.");
  }
  const token = randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + TTL_MS);
  await db()
    .update(tables.applicants)
    .set({ handoffToken: hashToken(token), handoffExpiresAt: expires })
    .where(eq(tables.applicants.id, applicant.id));
  return { url: `${env().APP_URL.replace(/\/$/, "")}/a/handoff/${token}`, expiresAt: expires.toISOString() };
}

/** One-time use: the token is cleared in the same statement that finds it. Returns null when unknown, used or expired. */
export async function consumeHandoff(token: string) {
  if (!token || token.length > 200) return null;
  const rows = await db()
    .update(tables.applicants)
    .set({ handoffToken: null, handoffExpiresAt: null })
    .where(and(eq(tables.applicants.handoffToken, hashToken(token)), gt(tables.applicants.handoffExpiresAt, new Date())))
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
