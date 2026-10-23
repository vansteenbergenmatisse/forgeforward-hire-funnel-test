import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import * as schema from "../../src/platform/db/schema";
import { allowR2Puts, trackStarts } from "../funnel/helpers";
import { cleanup, createProject, signIn, testDb, type E2eProject } from "./helpers";

let project: E2eProject;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await signIn(page);
  project = await createProject(page, "choice");
  await page.close();
});

test.afterAll(async () => {
  await cleanup([project]);
});

const saved = (page: Page) => expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible({ timeout: 10_000 });
const questionRows = async () => testDb().select().from(schema.projectQuestions).where(eq(schema.projectQuestions.projectId, project.id));

test("add a Choose one question with 3 options, answer it in the funnel, and the answer is stored as one text", async ({ page, browser }) => {
  await signIn(page);
  const label = `Years of experience ${Date.now()}`;
  await page.goto(`/adminMatt/p/${project.slug}/settings?tab=questions`);
  await page.getByRole("button", { name: "Add question" }).click();
  await page.getByLabel("Question", { exact: true }).fill(label);

  // Every type is on the screen with a clear name.
  for (const name of ["Short text", "Long text", "Number", "Choose one", "Choose several", "Yes or no"]) await expect(page.getByRole("radio", { name: new RegExp(name) })).toBeAttached();
  await page.getByRole("radio", { name: /Choose one/ }).check({ force: true });

  // Two empty choices to start. At least two stay: the remove buttons are off.
  await expect(page.getByLabel("Remove choice 1", { exact: true })).toBeDisabled();
  await page.getByLabel("Choice 1", { exact: true }).fill("Under 1 year");
  await page.getByLabel("Choice 2", { exact: true }).fill("1 to 3 years");
  await page.getByRole("button", { name: "Add choice" }).click();
  await page.getByLabel("Choice 3", { exact: true }).fill("3 years or more");

  // A repeated choice is refused with a clear message.
  await page.getByRole("button", { name: "Add choice" }).click();
  await page.getByLabel("Choice 4", { exact: true }).fill("under 1 YEAR");
  await page.getByLabel("Choice 4", { exact: true }).blur();
  await expect(page.getByText("Each choice must be different.")).toBeVisible();
  await page.getByLabel("Remove choice 4", { exact: true }).click();

  await page.getByRole("button", { name: "Save question" }).click();
  await saved(page);
  await expect.poll(async () => (await questionRows()).find((q) => q.label === label)?.options).toEqual(["Under 1 year", "1 to 3 years", "3 years or more"]);
  const q = (await questionRows()).find((r) => r.label === label)!;
  expect(q.type).toBe("single_choice");

  // Switching to Choose several and back keeps the choices.
  await page.getByRole("radio", { name: /Choose several/ }).check({ force: true });
  await expect.poll(async () => (await questionRows()).find((r) => r.id === q.id)?.type).toBe("multi_choice");
  await expect(page.getByLabel("Choice 3", { exact: true })).toHaveValue("3 years or more");
  await page.getByRole("radio", { name: /Choose one/ }).check({ force: true });
  await expect.poll(async () => (await questionRows()).find((r) => r.id === q.id)?.type).toBe("single_choice");
  expect((await questionRows()).find((r) => r.id === q.id)?.options).toEqual(["Under 1 year", "1 to 3 years", "3 years or more"]);

  // Make it optional, so the funnel offers "Clear my answer".
  await page.getByRole("switch", { name: /Required/ }).uncheck({ force: true });
  await expect.poll(async () => (await questionRows()).find((r) => r.id === q.id)?.required).toBe(false);

  // A visitor sees round bullets, picks exactly one, can clear it, and submits.
  const visitor = await browser.newPage();
  await allowR2Puts(visitor);
  const starts = trackStarts(visitor);
  await visitor.goto(`/a/${project.slug}?video=stub`);
  const group = visitor.getByRole("group", { name: new RegExp(label) });
  await expect(group.getByRole("radio")).toHaveCount(3);
  await group.getByText("1 to 3 years", { exact: true }).click();
  await expect(group.getByRole("radio", { name: "1 to 3 years" })).toBeChecked();
  await group.getByText("3 years or more", { exact: true }).click();
  await expect(group.getByRole("radio", { name: "3 years or more" })).toBeChecked();
  await expect(group.getByRole("radio", { name: "1 to 3 years" })).not.toBeChecked();
  await group.getByRole("button", { name: "Clear my answer" }).click();
  await expect(group.getByRole("radio", { checked: true })).toHaveCount(0);
  await group.getByText("1 to 3 years", { exact: true }).click();

  await visitor.getByLabel("First name", { exact: true }).fill("Choice");
  await visitor.getByLabel("Last name", { exact: true }).fill("Viewer");
  await visitor.getByLabel("Email", { exact: true }).fill(`e2e-choice-${Date.now()}@example.test`);
  await visitor.getByLabel("Phone", { exact: true }).fill("(415) 555-2671");
  await visitor.getByText("Yes", { exact: true }).first().click();
  await visitor.getByText("I agree that Forge Forward").click();
  await visitor.getByRole("button", { name: /Next: your video/ }).click();
  await expect(visitor.getByRole("button", { name: "Pretend the video uploaded" })).toBeVisible({ timeout: 15_000 });
  await visitor.close();

  // Stored: one text, under the question's own label.
  const [id] = [...starts];
  expect(id).toBeTruthy();
  const [row] = await testDb().select().from(schema.applicants).where(eq(schema.applicants.id, id));
  expect(row.answers[q.id]).toEqual({ label, type: "single_choice", value: "1 to 3 years" });

  // The drawer shows the chosen option.
  await page.goto(`/adminMatt/p/${project.slug}?tab=dnf&a=${id}`);
  await expect(page.getByRole("dialog").getByText(label)).toBeVisible();
  await expect(page.getByRole("dialog").getByText("1 to 3 years")).toBeVisible();
  expect((await page.request.delete(`/api/admin/applicants/${id}`)).ok()).toBeTruthy();
});
