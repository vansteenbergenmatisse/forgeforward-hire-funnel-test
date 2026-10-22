import { expect, test } from "@playwright/test";
import { ADMIN_PASSWORD, closeTestDb, testDb } from "./helpers";
import * as schema from "../../src/platform/db/schema";
import { like } from "drizzle-orm";

// Every failed try in this file comes from one address, so keep the wrong tries few and clear the limiter after.
test.afterAll(async () => {
  await testDb().delete(schema.rateLimitHits).where(like(schema.rateLimitHits.bucket, "admin-login:%"));
  await closeTestDb();
});

test("signed out, the dashboard address shows the login form and other pages stay hidden", async ({ page, request }) => {
  const res = await page.goto("/adminMatt");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  const input = page.getByLabel("Password");
  await expect(input).toHaveAttribute("autocomplete", "current-password");
  expect((await request.get("/adminMatt/test")).status()).toBe(404);
  expect((await request.get("/api/admin/projects")).status()).toBe(404);
});

test("a wrong password is refused, the right one opens the dashboard, sign out returns to the form", async ({ page }) => {
  await page.goto("/adminMatt");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Wrong password.")).toBeVisible();

  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/adminMatt$/);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  await page.goto("/adminMatt/login");
  await expect(page).toHaveURL(/\/adminMatt$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/adminMatt\/login$/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("a cross-site login post is refused", async ({ request }) => {
  const res = await request.post("/adminMatt/login/submit", {
    data: { password: ADMIN_PASSWORD },
    headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
  });
  expect(res.status()).toBe(403);
});
