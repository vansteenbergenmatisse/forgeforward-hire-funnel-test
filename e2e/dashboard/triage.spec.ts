import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import * as schema from "../../src/platform/db/schema";
import { cleanup, createProject, insertApplicant, signIn, stageOf, testDb, type E2eProject } from "./helpers";

// Keyboard triage and the answer filter. These run against `next dev`, where the triage keys are on.
let project: E2eProject;
let questionId: string;
const GOOD_NAME = "Good profile + english, invite interview";
const OPTIONS = ["Under 1 year", "1 to 3 years", "3 years or more"];

const stageByName = (name: string) => project.stages.find((s) => s.name === name)!;
const newStage = () => project.stages.find((s) => s.role === "entry_new")!;
const goodStage = () => project.stages.find((s) => s.name === GOOD_NAME)!;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await signIn(page);
  project = await createProject(page, "triage");
  await page.close();
  const db = testDb();
  // The project we triage has a "Good profile" stage. Rename the default "Did task" stage.
  const did = stageByName("Did task");
  await db.update(schema.stages).set({ name: GOOD_NAME }).where(eq(schema.stages.id, did.id));
  did.name = GOOD_NAME;
  const [q] = await db
    .insert(schema.projectQuestions)
    .values({ projectId: project.id, label: "How much experience do you have?", type: "single_choice", options: OPTIONS, required: true, position: 5 })
    .returning();
  questionId = q.id;
});

test.afterAll(async () => {
  await cleanup([project]);
});

const answer = (value: string) => ({ [questionId]: { label: "How much experience do you have?", type: "single_choice", value } });
const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000);
const card = (page: import("@playwright/test").Page, id: string) => page.locator(`[data-card-id="${id}"]`);

test("filter the board by an answer", async ({ page }) => {
  await signIn(page);
  const a = await insertApplicant(project, newStage().id, "fa", { answers: answer(OPTIONS[0]), createdAt: at(1) });
  const b = await insertApplicant(project, newStage().id, "fb", { answers: answer(OPTIONS[2]), createdAt: at(2) });
  const c = await insertApplicant(project, newStage().id, "fc", { answers: {}, createdAt: at(3) });
  await page.goto(`/adminMatt/p/${project.slug}`);
  await expect(card(page, a.id)).toBeVisible();

  await page.getByRole("button", { name: /How much experience/ }).click();
  await page.getByRole("checkbox", { name: OPTIONS[2] }).check();
  await expect(card(page, b.id)).toBeVisible();
  await expect(card(page, a.id)).toHaveCount(0);
  await expect(card(page, c.id)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /How much experience.*\(1\)/ })).toBeVisible();

  await page.getByRole("checkbox", { name: OPTIONS[0] }).check();
  await expect(card(page, a.id)).toBeVisible();
  await expect(card(page, b.id)).toBeVisible();
  await expect(card(page, c.id)).toHaveCount(0);
});

test("arrow keys move New applicants and open the next one, the video autoplays", async ({ page }) => {
  await signIn(page);
  // The other tests leave applicants in New. Start from an empty project so the queue is only the three below.
  await testDb().delete(schema.applicants).where(eq(schema.applicants.projectId, project.id));
  await page.addInitScript(() => {
    (window as unknown as { __plays: number }).__plays = 0;
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      (window as unknown as { __plays: number }).__plays += 1;
      return orig.call(this).catch(() => undefined) as Promise<void>;
    };
  });
  const media = { videoKey: "test/e2e/triage.webm", videoMime: "video/webm", videoSeconds: 5 };
  const first = await insertApplicant(project, newStage().id, "t1", { createdAt: at(10), ...media });
  const second = await insertApplicant(project, newStage().id, "t2", { createdAt: at(11), ...media });
  const third = await insertApplicant(project, newStage().id, "t3", { createdAt: at(12), ...media });
  const keep = project.stages.find((s) => s.name === "Rejected")!;

  await page.goto(`/adminMatt/p/${project.slug}?a=${first.id}`);
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByText("Good profile", { exact: true })).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect.poll(() => stageOf(first.id)).toBe(goodStage().id);
  await expect(page).toHaveURL(new RegExp(`a=${second.id}`));

  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => stageOf(second.id)).toBe(keep.id);
  await expect(page).toHaveURL(new RegExp(`a=${third.id}`));

  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => stageOf(third.id)).toBe(keep.id);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // One play() per opened applicant that had a video.
  expect(await page.evaluate(() => (window as unknown as { __plays: number }).__plays)).toBeGreaterThanOrEqual(3);
});

test("applicants already in another stage are never moved, and typing in notes does not trigger the keys", async ({ page }) => {
  await signIn(page);
  const worked = await insertApplicant(project, stageByName("Interviewed").id, "worked", { score: 4, notes: "Great call, send contract" });
  const fresh = await insertApplicant(project, newStage().id, "typing", { createdAt: at(1) });

  await page.goto(`/adminMatt/p/${project.slug}?a=${worked.id}`);
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Good profile", { exact: true })).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(500);
  expect(await stageOf(worked.id)).toBe(stageByName("Interviewed").id);
  await expect(drawer).toBeVisible();
  const [row] = await testDb().select({ score: schema.applicants.score, notes: schema.applicants.notes }).from(schema.applicants).where(eq(schema.applicants.id, worked.id));
  expect(row).toEqual({ score: 4, notes: "Great call, send contract" });

  await page.goto(`/adminMatt/p/${project.slug}?a=${fresh.id}`);
  await page.getByRole("dialog").locator("textarea").first().click();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
  expect(await stageOf(fresh.id)).toBe(newStage().id);
});
