import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import * as schema from "../../src/platform/db/schema";
import { cleanup, createProject, insertApplicant, signIn, testDb, type E2eProject } from "./helpers";

let a: E2eProject;
let b: E2eProject;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await signIn(page);
  a = await createProject(page, "life-a");
  b = await createProject(page, "life-b");
  await page.close();
});

test.afterAll(async () => {
  await cleanup([a, b]);
});

const statusOf = async (id: string) => (await testDb().select({ s: schema.projects.status }).from(schema.projects).where(eq(schema.projects.id, id)))[0]?.s;
const card = (page: Page, p: E2eProject) => page.getByRole("article", { name: p.name, exact: true });
const menu = async (page: Page, p: E2eProject, item: string) => {
  await card(page, p).getByRole("button", { name: `More actions for ${p.name}` }).click();
  await page.getByRole("menuitem", { name: item }).click();
};

test("deactivate, undo and reactivate from the card; the public link follows", async ({ page, browser }) => {
  await signIn(page);
  await page.goto("/adminMatt");
  await expect(card(page, a)).toBeVisible();
  await expect(card(page, a).getByText("Active", { exact: true })).toBeVisible();

  // Deactivate: one menu tap, no dialog. A toast offers Undo.
  await menu(page, a, "Deactivate");
  await expect(card(page, a).getByText("Inactive", { exact: true })).toBeVisible();
  const toast = page.getByRole("status").filter({ hasText: "is inactive" });
  await expect(toast).toBeVisible();
  expect(await statusOf(a.id)).toBe("closed");

  // Inactive projects sort below active ones (b was created after a, a is inactive, so b comes first).
  const names = await page.getByRole("article").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  expect(names.indexOf(b.name)).toBeLessThan(names.indexOf(a.name));

  // The public link shows the closed notice.
  const visitor = await browser.newPage();
  await visitor.goto(`/a/${a.slug}`);
  await expect(visitor.getByText("Applications for this role are closed.")).toBeVisible();

  // Undo puts it back at once.
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(card(page, a).getByText("Active", { exact: true })).toBeVisible();
  await expect.poll(() => statusOf(a.id)).toBe("open");
  await visitor.reload();
  await expect(visitor.getByRole("heading", { name: a.name })).toBeVisible();

  // Deactivate again, then reactivate from the menu. The data stays the whole time.
  const person = await insertApplicant(a, a.stages[0].id, "life");
  await menu(page, a, "Deactivate");
  await expect.poll(() => statusOf(a.id)).toBe("closed");
  await menu(page, a, "Reactivate");
  await expect(card(page, a).getByText("Active", { exact: true })).toBeVisible();
  await expect.poll(() => statusOf(a.id)).toBe("open");
  expect((await testDb().select().from(schema.applicants).where(eq(schema.applicants.id, person.id))).length).toBe(1);
  await visitor.close();
});

test("deactivate and reactivate from Settings > General, with the danger zone below", async ({ page }) => {
  await signIn(page);
  await page.goto(`/adminMatt/p/${b.slug}/settings?tab=general`);
  await page.getByRole("button", { name: "Deactivate", exact: true }).click();
  await expect.poll(() => statusOf(b.id)).toBe("closed");
  await expect(page.getByText("Inactive. Applicants see:")).toBeVisible();
  await page.getByRole("button", { name: "Reactivate", exact: true }).click();
  await expect.poll(() => statusOf(b.id)).toBe("open");
  await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
});

test("delete dialog: counts, name gate, project and applicants gone, the other project untouched", async ({ page }) => {
  await signIn(page);
  const doomed = await createProject(page, "life-doomed");
  await insertApplicant(doomed, doomed.stages[0].id, "d1");
  await insertApplicant(doomed, doomed.stages[0].id, "d2");
  await insertApplicant(b, b.stages[0].id, "keep");

  await page.goto("/adminMatt");
  await menu(page, doomed, "Delete project");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: `Delete ${doomed.name}?` })).toBeVisible();
  await expect(dialog.getByText("2 applicants")).toBeVisible();
  await expect(dialog.getByText(/\d+ stages?/)).toBeVisible();
  await expect(dialog.getByText(/\d+ message templates?/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Deactivate instead" })).toBeVisible();

  const del = dialog.getByRole("button", { name: "Delete project forever" });
  await expect(del).toBeDisabled();
  const input = dialog.getByLabel(/Type .* to confirm/);
  await input.fill("wrong name");
  await expect(del).toBeDisabled();
  await input.fill(doomed.name);
  await expect(del).toBeEnabled();
  await del.click();

  await expect(card(page, doomed)).toHaveCount(0);
  await expect.poll(async () => (await testDb().select().from(schema.projects).where(eq(schema.projects.id, doomed.id))).length).toBe(0);
  expect((await testDb().select().from(schema.applicants).where(eq(schema.applicants.projectId, doomed.id))).length).toBe(0);
  expect((await page.request.get(`/api/admin/projects/${doomed.slug}`)).status()).toBe(404);
  // The other project is untouched.
  await expect(card(page, b)).toBeVisible();
  expect((await testDb().select().from(schema.applicants).where(eq(schema.applicants.projectId, b.id))).length).toBeGreaterThan(0);
  const audit = await testDb().select().from(schema.adminAudit).where(eq(schema.adminAudit.targetId, doomed.slug));
  expect(audit.map((r) => r.action)).toContain("project.delete");
  await testDb().delete(schema.adminAudit).where(eq(schema.adminAudit.targetId, doomed.slug));
});

test("delete from the Settings danger zone sends you back to Projects", async ({ page }) => {
  await signIn(page);
  const doomed = await createProject(page, "life-settings");
  await page.goto(`/adminMatt/p/${doomed.slug}/settings?tab=general`);
  await page.getByRole("button", { name: "Delete project", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Type .* to confirm/).fill(doomed.name);
  await dialog.getByRole("button", { name: "Delete project forever" }).click();
  await expect(page).toHaveURL(/\/adminMatt\/?$/);
  await expect.poll(async () => (await testDb().select().from(schema.projects).where(eq(schema.projects.id, doomed.id))).length).toBe(0);
  await testDb().delete(schema.adminAudit).where(eq(schema.adminAudit.targetId, doomed.slug));
});
