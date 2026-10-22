import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import * as schema from "../../src/platform/db/schema";
import { allowR2Puts, trackStarts } from "../funnel/helpers";
import { cleanup, createProject, insertApplicant, signIn, stageOf, testDb, type E2eProject } from "./helpers";

let project: E2eProject;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await signIn(page);
  project = await createProject(page, "settings");
  await page.close();
});

test.afterAll(async () => {
  await cleanup([project]);
});

const saved = (page: Page) => expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible({ timeout: 10_000 });

async function stageRows() {
  return testDb().select().from(schema.stages).where(eq(schema.stages.projectId, project.id));
}

test("stage CRUD: add, rename, delete with a target moves the cards", async ({ page }) => {
  await signIn(page);
  const doomed = project.stages.find((s) => s.role === null);
  const target = project.stages.find((s) => s.role === "entry_new");
  if (!doomed || !target) throw new Error("expected a role-less stage and an entry_new stage");
  const a = await insertApplicant(project, doomed.id, "stagedel");

  await page.goto(`/admin/p/${project.slug}/settings?tab=stages`);

  // Add and rename.
  await page.getByRole("button", { name: "Add stage" }).click();
  await page.keyboard.type("E2E Extra");
  await saved(page);
  await expect.poll(async () => (await stageRows()).some((s) => s.name === "E2E Extra")).toBe(true);
  await page.reload();
  await expect(page.getByLabel("Name of stage E2E Extra")).toBeVisible();

  // Delete a stage that holds a card: the dialog asks where the card goes.
  await page.getByRole("button", { name: `Delete ${doomed.name}`, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/1 applicant card sits/)).toBeVisible();
  await dialog.getByLabel("Move cards to").selectOption({ label: target.name });
  await dialog.getByRole("button", { name: /Move 1 card and delete/ }).click();
  await expect(page.getByText(`Deleted ${doomed.name}. Moved 1 card to ${target.name}.`)).toBeVisible();
  await saved(page);

  await expect.poll(async () => (await stageRows()).some((s) => s.id === doomed.id)).toBe(false);
  expect(await stageOf(a.id)).toBe(target.id);
  await page.reload();
  await expect(page.getByLabel(`Name of stage ${doomed.name}`)).toHaveCount(0);

  // Remove the extra stage again (empty, no target needed).
  await page.getByRole("button", { name: "Delete E2E Extra", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete stage" }).click();
  await saved(page);
  await expect.poll(async () => (await stageRows()).some((s) => s.name === "E2E Extra")).toBe(false);
});

test("archiving a question keeps the label on old answers", async ({ page }) => {
  await signIn(page);
  const label = `E2E favourite colour ${Date.now()}`;
  await page.goto(`/admin/p/${project.slug}/settings?tab=questions`);

  await page.getByRole("button", { name: "Add question" }).click();
  await page.getByLabel("Question", { exact: true }).fill(label);
  await page.getByRole("button", { name: "Save question" }).click();
  await expect.poll(async () => (await testDb().select().from(schema.projectQuestions).where(eq(schema.projectQuestions.label, label))).length).toBe(1);
  const [q] = await testDb().select().from(schema.projectQuestions).where(eq(schema.projectQuestions.label, label));

  // An old answer stored under that question.
  const a = await insertApplicant(project, project.stages[0].id, "answer", {
    answers: { [q.id]: { label, type: q.type, value: "blue" } } as never,
  });

  await page.getByRole("button", { name: "Archive question" }).click();
  await expect.poll(async () => (await testDb().select().from(schema.projectQuestions).where(eq(schema.projectQuestions.id, q.id)))[0].archived).toBe(true);
  await page.reload();
  await expect(page.getByRole("list", { name: "Archived questions" }).getByText(label)).toBeVisible();
  const [after] = await testDb().select().from(schema.projectQuestions).where(eq(schema.projectQuestions.id, q.id));
  expect(after.archived).toBe(true);

  // The drawer still shows the answer under its old label.
  await page.goto(`/admin/p/${project.slug}?a=${a.id}`);
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByText(label)).toBeVisible();
  await expect(drawer.getByText("blue")).toBeVisible();
});

test("a task saved with Tiptap shows in the funnel", async ({ page, browser }) => {
  await signIn(page);
  const title = `E2E task ${Date.now()}`;
  const text = `Write your first text ${Date.now()}`;
  await page.goto(`/admin/p/${project.slug}/settings?tab=task`);
  const toggle = page.getByRole("switch", { name: /Task is/ });
  if (!(await toggle.isChecked())) await toggle.check({ force: true });
  const titleInput = page.getByLabel("Title", { exact: true });
  await titleInput.fill(title);
  const editor = page.getByRole("textbox", { name: "Task" });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(text);
  await saved(page);
  await expect.poll(async () => JSON.stringify((await testDb().select().from(schema.projects).where(eq(schema.projects.id, project.id)))[0].taskContent)).toContain(text);

  // A fresh anonymous visitor walks the funnel to the task step.
  const visitor = await browser.newPage();
  await allowR2Puts(visitor);
  const starts = trackStarts(visitor);
  await visitor.goto(`/a/${project.slug}?video=stub`);
  await visitor.getByLabel("First name", { exact: true }).fill("Task");
  await visitor.getByLabel("Last name", { exact: true }).fill("Viewer");
  await visitor.getByLabel("Email", { exact: true }).fill(`e2e-task-${Date.now()}@example.test`);
  await visitor.getByLabel("Phone", { exact: true }).fill("(415) 555-2671");
  await visitor.getByText("Yes", { exact: true }).first().click();
  await visitor.getByText("I agree that Forge Forward").click();
  await visitor.getByRole("button", { name: /Next: your video/ }).click();
  await visitor.getByRole("button", { name: "Pretend the video uploaded" }).click();
  await expect(visitor.getByText(text)).toBeVisible({ timeout: 15_000 });
  await expect(visitor.getByText(title)).toBeVisible();
  await visitor.close();
  // Delete through the API so the stub video leaves no object under test/ in R2.
  for (const id of starts) expect((await page.request.delete(`/api/admin/applicants/${id}`)).ok()).toBeTruthy();
});
