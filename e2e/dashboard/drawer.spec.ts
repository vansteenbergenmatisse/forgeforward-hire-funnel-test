import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import * as schema from "../../src/platform/db/schema";
import { cleanup, createProject, insertApplicant, signIn, stageOf, testDb, type E2eProject } from "./helpers";

let project: E2eProject;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await signIn(page);
  project = await createProject(page, "drawer");
  await page.close();
  // Default templates use {cal_link}; without one the send panel blocks.
  await testDb().update(schema.projects).set({ calLink: "https://cal.com/e2e/interview" }).where(eq(schema.projects.id, project.id));
});

test.afterAll(async () => {
  await cleanup([project]);
});

test("the drawer moves a card by DB stage id and a sent message survives a reload", async ({ page }) => {
  await signIn(page);
  const a = await insertApplicant(project, project.stages[0].id, "drawer");
  const target = project.stages[1];
  await page.goto(`/admin/p/${project.slug}?a=${a.id}`);

  const drawer = page.getByRole("dialog");
  const picker = drawer.getByRole("combobox").first();
  await expect(picker).toHaveValue(project.stages[0].id);
  await picker.selectOption(target.id);
  await expect.poll(() => stageOf(a.id)).toBe(target.id);

  // Link mode: the server saves the message, nothing is sent (no provider keys in the test server).
  const text = `E2E hello ${Date.now()}`;
  await drawer.getByRole("button", { name: "SMS", exact: true }).click();
  await page.getByLabel("Message", { exact: true }).fill(text);
  await page.context().route("sms:*", (r) => r.abort());
  await page.getByRole("button", { name: "Send SMS" }).click();
  await expect.poll(async () => (await testDb().select().from(schema.messages).where(eq(schema.messages.applicantId, a.id))).map((m) => `${m.mode}:${m.status}:${m.body}`)).toEqual([`link:opened_link:${text}`]);

  await page.goto(`/admin/p/${project.slug}?a=${a.id}`);
  await expect(page.getByRole("dialog").getByText(text)).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("combobox").first()).toHaveValue(target.id);
});
