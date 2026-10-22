import { createHmac, randomBytes } from "node:crypto";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, inArray, like } from "drizzle-orm";
import postgres from "postgres";
import { expect, type Page } from "@playwright/test";
import * as schema from "../../src/platform/db/schema";

config({ path: [".env.local", ".env.development.local", ".env"], quiet: true });

// Same defaults as scripts/e2e-dashboard-server.ts. Never the real secrets.
export const ADMIN_KEY = process.env.E2E_ADMIN_KEY ?? "e2e-admin-key-".padEnd(48, "x");
export const CAL_SECRET = process.env.E2E_CALCOM_SECRET ?? "e2e-calcom-test-secret";

export const rand = () => randomBytes(4).toString("hex");

let sql: postgres.Sql | null = null;
export function testDb() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  sql ??= postgres(url, { max: 2, prepare: false });
  return drizzle(sql, { schema });
}
export async function closeTestDb() {
  await sql?.end();
  sql = null;
}

/** Sets the admin cookie for this browser context. */
export async function signIn(page: Page) {
  await page.goto(`/admin/k/${ADMIN_KEY}`);
}

type Stage = { id: string; name: string; role: string | null };
export type E2eProject = { slug: string; id: string; name: string; stages: Stage[] };

/** Creates a blank project through the admin API (page must be signed in). */
export async function createProject(page: Page, label: string): Promise<E2eProject> {
  const name = `E2E ${label} ${rand()}`;
  const res = await page.request.post("/api/admin/projects", { data: { name, mode: "blank" } });
  expect(res.ok()).toBeTruthy();
  const dto = (await res.json()) as { def: { slug: string }; stages: Stage[] };
  const [row] = await testDb().select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.slug, dto.def.slug));
  return { slug: dto.def.slug, id: row.id, name, stages: dto.stages };
}

/** A completed, non-test applicant. Test applicants are hidden from the board, so these are real rows in the test database. */
export async function insertApplicant(project: E2eProject, stageId: string | null, tag: string, extra: Partial<typeof schema.applicants.$inferInsert> = {}) {
  const email = `e2e-${tag}-${rand()}@example.test`;
  const [row] = await testDb()
    .insert(schema.applicants)
    .values({
      projectId: project.id,
      stageId,
      resumeToken: randomBytes(16).toString("hex"),
      firstName: `E2e${tag}`,
      lastName: "Person",
      email,
      phoneE164: "+14155552671",
      phoneCountry: "US",
      timezone: "America/New_York",
      consentAt: new Date(),
      consentText: "e2e",
      funnelStep: "completed",
      completedAt: new Date(),
      ...extra,
    })
    .returning();
  return row;
}

export async function stageOf(applicantId: string): Promise<string | null> {
  const [r] = await testDb().select({ s: schema.applicants.stageId }).from(schema.applicants).where(eq(schema.applicants.id, applicantId));
  return r?.s ?? null;
}

/** Deletes the project (cascades to stages, questions, applicants, events, messages) and any leftover webhook rows. */
export async function cleanup(projects: E2eProject[], uids: string[] = []) {
  const db = testDb();
  if (projects.length) await db.delete(schema.projects).where(inArray(schema.projects.id, projects.map((p) => p.id)));
  await db.delete(schema.unmatchedBookings).where(like(schema.unmatchedBookings.attendeeEmail, "e2e-%"));
  if (uids.length) {
    const keys = uids.flatMap((u) => ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"].map((t) => `${u}:${t}`));
    await db.delete(schema.processedWebhooks).where(and(eq(schema.processedWebhooks.provider, "calcom"), inArray(schema.processedWebhooks.externalId, keys)));
  }
}

export function calBody(opts: { uid: string; email: string; applicantId?: string; trigger?: string }): string {
  return JSON.stringify({
    triggerEvent: opts.trigger ?? "BOOKING_CREATED",
    createdAt: new Date().toISOString(),
    payload: {
      uid: opts.uid,
      title: "E2E interview",
      startTime: "2030-01-15T15:00:00.000Z",
      endTime: "2030-01-15T15:30:00.000Z",
      attendees: [{ email: opts.email, name: "E2E" }],
      ...(opts.applicantId ? { metadata: { applicant_id: opts.applicantId } } : {}),
    },
  });
}

export const sign = (body: string, secret = CAL_SECRET) => createHmac("sha256", secret).update(body).digest("hex");
