import { expect, test } from "@playwright/test";
import { START, allowR2Puts, fillDetails, passVideo, submitDetails, trackStarts } from "./helpers";

test.describe("applicant funnel core", () => {
  test.beforeEach(async ({ page }) => {
    await allowR2Puts(page);
  });

  test("happy path with task", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Playwright WebKit drops Blob PUT bodies inside page.route, so the R2 upload cannot be intercepted. Chromium and Firefox cover this flow.");
    await page.goto(START);
    await expect(page.getByRole("heading", { name: "Appointment Setter" })).toBeVisible();
    await fillDetails(page);
    await submitDetails(page);
    await passVideo(page);
    await expect(page.getByRole("heading", { name: /Optional task/ })).toBeVisible();
    await page.getByLabel("Your text").fill("Hi Mike, it's Sam from Forge Forward.");
    await page.getByRole("button", { name: "Submit task" }).click();
    await expect(page.getByRole("heading", { name: "Thanks, Sam" })).toBeVisible();
    await expect(page.getByText("within 5 days")).toBeVisible();
    const tasks = await page.evaluate(() => window.__funnelMock?.tasks);
    if (tasks !== undefined) expect(tasks).toBe(1);
  });

  test("skip task asks once and finishes", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Playwright WebKit drops Blob PUT bodies inside page.route, so the R2 upload cannot be intercepted. Chromium and Firefox cover this flow.");
    await page.goto(START);
    await fillDetails(page);
    await submitDetails(page);
    await passVideo(page);
    await page.getByRole("button", { name: "Skip task" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Skip the task?")).toBeVisible();
    await dialog.getByRole("button", { name: "Skip task" }).click();
    await expect(page.getByRole("heading", { name: "Thanks, Sam" })).toBeVisible();
    const skips = await page.evaluate(() => window.__funnelMock?.skips);
    if (skips !== undefined) expect(skips).toBe(1);
  });

  test("shows errors and keeps typed values", async ({ page }) => {
    await page.goto(START);
    await page.getByLabel("First name", { exact: true }).fill("Sam");
    await submitDetails(page);
    await expect(page.getByText(/things need a fix\. We kept everything you typed\./)).toBeVisible();
    await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Sam");
    await expect(page.getByLabel("Last name", { exact: true })).toBeFocused();
  });

  test("double tap on submit makes one applicant", async ({ page }) => {
    const started = trackStarts(page);
    await page.goto(START + "&sim=slow");
    await fillDetails(page);
    const next = page.getByRole("button", { name: /Next: your video/ });
    await next.dblclick();
    await next.click({ force: true, timeout: 1000 }).catch(() => {});
    await expect(page.getByRole("button", { name: "Pretend the video uploaded" })).toBeVisible({ timeout: 15_000 });
    const applicants = await page.evaluate(() => window.__funnelMock?.applicants);
    if (applicants !== undefined) expect(applicants).toBe(1);
    else expect(started.size).toBe(1); // real API: every call carries one idempotency key
  });

  test("refresh keeps the place", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Playwright WebKit drops Blob PUT bodies inside page.route, so the R2 upload cannot be intercepted. Chromium and Firefox cover this flow.");
    await page.goto(START);
    await fillDetails(page);
    await submitDetails(page);
    await passVideo(page);
    await expect(page.getByRole("heading", { name: /Optional task/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: /Optional task/ })).toBeVisible();
  });

  test("closed project", async ({ page }) => {
    await page.goto("/a/closed-demo");
    await expect(page.getByText("Applications for this role are closed.")).toBeVisible();
  });

  test("unknown project", async ({ page }) => {
    await page.goto("/a/nope");
    await expect(page.getByText("This page does not exist.")).toBeVisible();
  });

  test("in-app browser screen", async ({ browser }) => {
    const ctx = await browser.newContext({
      userAgent: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 Instagram 300.0",
      viewport: { width: 390, height: 844 },
    });
    const page = await ctx.newPage();
    await page.goto(START);
    await expect(page.getByRole("heading", { name: "Open this in your browser" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open in Chrome" })).toHaveAttribute("href", /^intent:\/\//);
    await page.getByRole("button", { name: "Continue here anyway" }).click();
    await expect(page.getByRole("heading", { name: "Appointment Setter" })).toBeVisible();
    await ctx.close();
  });
});
