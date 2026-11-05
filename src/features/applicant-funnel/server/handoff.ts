import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { env } from "@/shared/env";
import { takeRateLimit } from "@/shared/rate-limit";
import { hashToken } from "@/shared/token-hash";
import { addEvent, requireApplicant } from "./applicant";
import { ApiError } from "./errors";
import { loadProjectRow } from "./project";
import { limitStore } from "./rate-limit";
import { makeShadowToken, readShadowToken } from "./shadow";

const TTL_MS = 30 * 60_000;
const ISSUE_RULE = { max: 5, windowMs: 10 * 60_000 };

/** A shadow applicant gets a working link too. It is signed and expires like a real one, and nothing is stored. */
async function createShadowHandoff(slug: string) {
  const project = await loadProjectRow(slug);
  if (!project) throw new ApiError(404, "not_found");
  if (!project.handoffEnabled) throw new ApiError(403, "handoff_off");
  const token = makeShadowToken("handoff", slug, TTL_MS);
  return { url: `${env().APP_URL.replace(/\/$/, "")}/a/handoff/${token}`, expiresAt: new Date(Date.now() + TTL_MS).toISOString() };
}

export async function createHandoff(resumeToken: string) {
  const shadow = readShadowToken(resumeToken, "resume");
  if (shadow) return createShadowHandoff(shadow.slug);
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

/**
 * One-time use: the token is cleared in the same statement that finds it. Returns null when unknown, used or expired.
 * Resume tokens are stored hashed, so the old one cannot be read back. The new device gets a fresh resume token (the
 * old one stops working in the same statement), which also limits a leaked token to the time until the next handoff.
 */
export async function consumeHandoff(token: string) {
  if (!token || token.length > 200) return null;
  const shadow = readShadowToken(token, "handoff");
  if (shadow) {
    return { slug: shadow.slug, resumeToken: makeShadowToken("resume", shadow.slug), applicantId: randomUUID(), firstName: "there", funnelStep: "form_done" as const };
  }
  const resumeToken = randomBytes(24).toString("base64url");
  const rows = await db()
    .update(tables.applicants)
    .set({ handoffToken: null, handoffExpiresAt: null, resumeTokenHash: hashToken(resumeToken) })
    .where(and(eq(tables.applicants.handoffToken, hashToken(token)), gt(tables.applicants.handoffExpiresAt, new Date())))
    .returning({
      id: tables.applicants.id,
      firstName: tables.applicants.firstName,
      projectId: tables.applicants.projectId,
      funnelStep: tables.applicants.funnelStep,
    });
  const row = rows[0];
  if (!row) return null;
  await addEvent(row.id, "handoff_used");
  const [project] = await db().select({ slug: tables.projects.slug }).from(tables.projects).where(eq(tables.projects.id, row.projectId));
  return { slug: project.slug, resumeToken, applicantId: row.id, firstName: row.firstName, funnelStep: row.funnelStep };
}
