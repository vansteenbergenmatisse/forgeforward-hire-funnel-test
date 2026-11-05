import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import * as schema from "../../src/platform/db/schema";
import { allowR2Puts } from "../funnel/helpers";
import { cleanup, createProject, insertApplicant, signIn, testDb, type E2eProject } from "./helpers";

// Needs the dashboard server started with FUNNEL_RATE_LIMIT_MAX=200 (several /start calls come from one address).
const PHONE = "+14155552671";
const PHONE_SPACED = "+1 (415) 555-2671";
let one: E2eProject;
let two: E2eProject;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await signIn(page);
  one = await createProject(page, "dup-one");
  two = await createProject(page, "dup-two");
  await page.close();
  await testDb().update(schema.projects).set({ handoffEnabled: true }).where(eq(schema.projects.id, one.id));
});

test.afterAll(async () => {
  await cleanup([one, two]);
});

const rowsFor = async (projectId: string, email: string) =>
  testDb().select().from(schema.applicants).where(and(eq(schema.applicants.projectId, projectId), eq(schema.applicants.email, email)));

async function start(request: APIRequestContext, slug: string, email: string, phone = PHONE_SPACED) {
  const res = await request.post("/api/apply/start", {
    headers: { "idempotency-key": randomUUID() },
    data: { projectSlug: slug, firstName: "Dup", lastName: "Test", email, phone, phoneCountry: "US", whatsappOk: true, timezone: "America/New_York", consent: true, answers: {} },
  });
  return { res, body: (await res.json()) as { applicant_id: string; resume_token: string } };
}

test("a new phone number is saved as usual", async ({ request }) => {
  const email = `e2e-new-${Date.now()}@example.test`;
  const { res, body } = await start(request, one.slug, email, "+14155550123");
  expect(res.status()).toBe(200);
  expect(body.resume_token.startsWith("shadow.")).toBe(false);
  expect(await rowsFor(one.id, email)).toHaveLength(1);
});

test("a phone number that already finished walks every step but nothing is saved", async ({ request }) => {
  await insertApplicant(one, one.stages[0].id, "first", { phoneE164: PHONE });
  const email = `e2e-dup-${Date.now()}@example.test`;
  const before = await testDb().select().from(schema.applicants).where(eq(schema.applicants.projectId, one.id));

  const { res, body } = await start(request, one.slug, email);
  expect(res.status()).toBe(200);
  expect(body.resume_token.startsWith("shadow.")).toBe(true);
  expect(body.applicant_id).toMatch(/^[0-9a-f-]{36}$/);

  // Upload link: same shape as a real one, under shadow/.
  const up = await request.post("/api/apply/upload-url", { data: { resumeToken: body.resume_token, kind: "video", mime: "video/webm", bytes: 1000, withThumb: true, thumbBytes: 500 } });
  expect(up.status()).toBe(200);
  const urls = (await up.json()) as { key: string; putUrl: string; thumbKey?: string; thumbPutUrl?: string };
  expect(urls.key).toContain("/shadow/videos/");
  expect(urls.putUrl).toContain("http");
  expect(urls.thumbKey).toContain("/shadow/thumbs/");

  // A key outside the session's own folder is refused, so the token cannot delete anything else.
  const bad = await request.post("/api/apply/video/complete", { data: { resumeToken: body.resume_token, key: "videos/other/x.webm", mime: "video/webm", bytes: 1000, seconds: 5, audioOnly: false, retakeUsed: false } });
  expect(bad.status()).toBe(400);

  const done = await request.post("/api/apply/video/complete", { data: { resumeToken: body.resume_token, key: urls.key, thumbKey: urls.thumbKey, mime: "video/webm", bytes: 1000, seconds: 5, audioOnly: false, retakeUsed: false } });
  expect(done.status()).toBe(200);

  const task = await request.post("/api/apply/task", { headers: { "idempotency-key": randomUUID() }, data: { resumeToken: body.resume_token, skip: true } });
  expect(task.status()).toBe(200);
  expect(((await task.json()) as { stage: string }).stage).toBe("entry_new");

  const hand = await request.post("/api/apply/handoff", { data: { resumeToken: body.resume_token } });
  expect(hand.status()).toBe(200);
  expect(((await hand.json()) as { url: string }).url).toContain("/a/handoff/shadow.");

  // Nothing new in the database: no applicant, no events.
  expect(await rowsFor(one.id, email)).toHaveLength(0);
  const after = await testDb().select().from(schema.applicants).where(eq(schema.applicants.projectId, one.id));
  expect(after).toHaveLength(before.length);
});

test("a forged shadow token is refused", async ({ request }) => {
  const forged = await request.post("/api/apply/upload-url", { data: { resumeToken: "shadow.eHx4fDB8eA.AAAA", kind: "video", mime: "video/webm", bytes: 1000 } });
  expect(forged.status()).toBe(404);
});

test("someone who only filled the form earlier can still apply", async ({ request }) => {
  const phone = "+14155550188";
  await insertApplicant(two, null, "quit", { phoneE164: phone, funnelStep: "form_done", completedAt: null });
  const email = `e2e-back-${Date.now()}@example.test`;
  const { body } = await start(request, two.slug, email, phone);
  expect(body.resume_token.startsWith("shadow.")).toBe(false);
  expect(await rowsFor(two.id, email)).toHaveLength(1);
});

test("the same phone number can apply to a different project", async ({ request }) => {
  const email = `e2e-other-${Date.now()}@example.test`;
  const { body } = await start(request, two.slug, email, PHONE);
  expect(body.resume_token.startsWith("shadow.")).toBe(false);
  expect(await rowsFor(two.id, email)).toHaveLength(1);
});

// The thank you page loads the Meta Pixel for a new application only. A repeat applicant sees the same page, no pixel.
async function applyThroughUi(page: Page, slug: string, email: string, phone: string) {
  // Never send a real event to Facebook from a test.
  await page.route(/facebook\.com|facebook\.net/, (route) => route.abort());
  await allowR2Puts(page);
  await page.goto(`/a/${slug}?video=stub`);
  await page.getByLabel("First name", { exact: true }).fill("Pixel");
  await page.getByLabel("Last name", { exact: true }).fill("Check");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Phone", { exact: true }).fill(phone);
  await page.getByText("Yes", { exact: true }).first().click();
  await page.getByText("I agree that Forge Forward").click();
  await page.getByRole("button", { name: /Next: your video/ }).click();
  await page.getByRole("button", { name: "Pretend the video uploaded" }).click();
  await expect(page).toHaveURL(new RegExp(`/a/${slug}/thanks`), { timeout: 20_000 });
  await expect(page.getByRole("heading").first()).toBeVisible();
}

test("the Meta Pixel loads for a new application and stays off for a repeat applicant", async ({ browser }) => {
  const project = (await browser.newPage().then(async (p) => {
    await signIn(p);
    const made = await createProject(p, "dup-pixel");
    await p.close();
    return made;
  })) as E2eProject;
  try {
    await insertApplicant(project, project.stages[0].id, "pixelorig", { phoneE164: "+14155550177" });
    const hasPixel = (page: Page) => page.evaluate(() => typeof (window as unknown as { fbq?: unknown }).fbq === "function" || Boolean(document.getElementById("meta-pixel")));

    const fresh = await browser.newPage();
    await applyThroughUi(fresh, project.slug, `e2e-pixel-new-${Date.now()}@example.test`, "(415) 555-0178");
    await expect.poll(() => hasPixel(fresh)).toBe(true);
    await fresh.close();

    const repeat = await browser.newPage();
    await applyThroughUi(repeat, project.slug, `e2e-pixel-dup-${Date.now()}@example.test`, "(415) 555-0177");
    await repeat.waitForTimeout(2000);
    expect(await hasPixel(repeat)).toBe(false);
    await repeat.close();

    // Only the first applicant and the new one are saved. The repeat is not.
    const rows = await testDb().select().from(schema.applicants).where(eq(schema.applicants.projectId, project.id));
    expect(rows.map((r) => r.phoneE164).sort()).toEqual(["+14155550177", "+14155550178"]);
  } finally {
    await cleanup([project]);
  }
});
