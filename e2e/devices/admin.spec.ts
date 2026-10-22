import { expect, shot, test } from "./fixtures";

const PASSWORD = process.env.ADMIN_PASSWORD;

test("signed out, /adminMatt shows the login page with a password field", async ({ page, request }, info) => {
  const res = await page.goto("/adminMatt");
  expect(res?.status()).toBe(200);
  const field = page.getByLabel("Password");
  await expect(field).toBeVisible();
  await expect(field).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(w[0]).toBeLessThanOrEqual(w[1]);
  if (info.project.use.isMobile) {
    const size = await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size, "password field under 16px makes iOS zoom").toBeGreaterThanOrEqual(16);
  }
  await shot(page, info, "admin-login");
  expect((await request.get("/api/admin/projects")).status()).toBe(404);
  expect((await request.get("/admin")).status()).toBe(404);
});

test("wrong key link and bare /admin stay 404", async ({ request }, info) => {
  // A wrong key counts as a failed try on the server (10 per 10 minutes per address), so only one project does it.
  test.skip(info.project.name !== "Desktop Chrome", "single-project check to protect the key route rate limit");
  expect((await request.get("/adminMatt/k/wrong", { maxRedirects: 0 })).status()).toBe(404);
});

test.describe("signed in", () => {
  test.skip(!PASSWORD, "ADMIN_PASSWORD is not set: skipping the signed-in checks (board, settings, test console)");

  test("board, settings and test console load and look right", async ({ page }, info) => {
    await page.goto("/adminMatt");
    await page.getByLabel("Password").fill(PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await shot(page, info, "admin-home");

    await page.goto("/adminMatt/p/appointment-setter");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await page.waitForLoadState("networkidle").catch(() => {});
    await shot(page, info, "admin-board");
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    // The dashboard is built for laptops (see CLAUDE.md). On phones a sideways scroll is reported, not failed.
    if (info.project.use.isMobile) {
      if (w[0] > w[1]) info.annotations.push({ type: "admin-board-sideways-scroll", description: `scrollWidth ${w[0]} > innerWidth ${w[1]}` });
    } else expect(w[0], "board page scrolls sideways").toBeLessThanOrEqual(w[1]);

    await page.goto("/adminMatt/p/appointment-setter/settings");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await page.waitForLoadState("networkidle").catch(() => {});
    await shot(page, info, "admin-settings");

    // Opening the test console page does not run any check. Running them would create test data.
    await page.goto("/adminMatt/test");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await shot(page, info, "admin-test-console");
  });
});
