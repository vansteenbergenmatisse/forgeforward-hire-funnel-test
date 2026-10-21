import { expect, type Page } from "@playwright/test";

/** Short timers so a full take is quick: 2 s prep, recording stops by itself at 6 s. */
export const HARNESS = "/dev/video-flow?prep=2&max=6";

/** Camera check, prep, countdown and a full recording. Ends on the review screen. */
export async function recordTake(page: Page) {
  await page.getByRole("button", { name: "Turn on camera" }).click();
  await expect(page.getByRole("heading", { name: "Looking good" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await recordFromPrep(page);
}

export async function recordFromPrep(page: Page) {
  await page.getByRole("button", { name: "I'm ready" }).click();
  await expect(page.getByRole("heading", { name: "How did that look?" })).toBeVisible({ timeout: 30_000 });
}
