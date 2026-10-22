import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { optionalEnv } from "@/shared/env";
import { takeRateLimit } from "@/shared/rate-limit";
import { hashToken } from "@/shared/token-hash";
import { CONSENT_TEXT, startSchema } from "../schemas";
import { buildAnswers } from "./answers";
import { isTestConsole, TEST_CONSOLE_HEADER } from "./bypass";
import { ApiError } from "./errors";
import { parseBody } from "./http";
import { once } from "./idempotency";
import { loadProjectRow } from "./project";
import { clientIp, ipBucket, limitStore } from "./rate-limit";

const WINDOW_MS = 10 * 60_000;
function maxPerWindow() {
  const n = Number(optionalEnv("FUNNEL_RATE_LIMIT_MAX"));
  return Number.isInteger(n) && n > 0 ? n : 5;
}

/** Honeypot hit: looks like success, saves nothing. */
export function fakeSession() {
  return { applicant_id: randomUUID(), resume_token: randomBytes(24).toString("base64url") };
}

export function isHoneypot(body: unknown): boolean {
  const w = (body as { website?: unknown } | null)?.website;
  return typeof w === "string" && w.trim() !== "";
}

export async function startApplication(req: Request, body: unknown, key: string) {
  const input = parseBody(startSchema, body);
  const bypass = isTestConsole(req.headers.get(TEST_CONSOLE_HEADER), process.env.ADMIN_KEY);
  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;

  // A replayed key only returns the stored session to the same caller sending the same body.
  const scopedKey = createHash("sha256").update(`${key}\n${ip}\n${JSON.stringify(body)}`).digest("hex");

  return once("start", scopedKey, async () => {
    const project = await loadProjectRow(input.projectSlug);
    if (!project) throw new ApiError(404, "not_found");
    if (project.status !== "open") throw new ApiError(403, "closed", "Applications for this role are closed.");

    const questions = await db()
      .select()
      .from(tables.projectQuestions)
      .where(eq(tables.projectQuestions.projectId, project.id))
      .orderBy(asc(tables.projectQuestions.position));
    const answers = buildAnswers(questions, input.answers);

    // Charged only once the application is valid, so a mistyped form never uses up an attempt.
    if (!bypass && !(await takeRateLimit(limitStore(), ipBucket("start", ip), { max: maxPerWindow(), windowMs: WINDOW_MS }))) {
      throw new ApiError(429, "rate_limited", "Too many tries. Wait a few minutes and try again.");
    }

    const [previous] = await db()
      .select({ id: tables.applicants.id })
      .from(tables.applicants)
      .where(and(eq(tables.applicants.projectId, project.id), eq(tables.applicants.email, input.email)))
      .orderBy(desc(tables.applicants.createdAt))
      .limit(1);

    const resumeToken = randomBytes(24).toString("base64url");
    const now = new Date();
    const applicantId = await db().transaction(async (tx) => {
      const [row] = await tx
        .insert(tables.applicants)
        .values({
          projectId: project.id,
          stageId: null,
          resumeTokenHash: hashToken(resumeToken),
          isTest: bypass,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phoneE164: input.phoneE164,
          phoneCountry: input.phoneCountry ?? null,
          whatsappOk: input.whatsappOk,
          timezone: input.timezone,
          consentAt: now,
          consentText: CONSENT_TEXT,
          answers,
          funnelStep: "form_done",
          appliedBefore: Boolean(previous),
          previousApplicantId: previous?.id ?? null,
          utm: input.utm,
          userAgent,
          inAppBrowser: input.inAppBrowser,
        })
        .returning({ id: tables.applicants.id });
      await tx.insert(tables.applicantEvents).values({ applicantId: row.id, type: "form_submitted", data: {} });
      return row.id;
    });
    return { applicant_id: applicantId, resume_token: resumeToken };
  });
}
