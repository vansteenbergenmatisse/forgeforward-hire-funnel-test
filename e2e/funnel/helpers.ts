import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const START = "/a/appointment-setter?video=stub";

export async function fillDetails(page: Page) {
  await page.getByLabel("First name", { exact: true }).fill("Sam");
  await page.getByLabel("Last name", { exact: true }).fill("Rivera");
  await page.getByLabel("Email", { exact: true }).fill("sam@example.com");
  await page.getByLabel("Phone", { exact: true }).fill("(415) 555-2671");
  await page.getByText("Yes", { exact: true }).first().click();
  await page.getByRole("radio", { name: "3 to 5 years" }).check({ force: true });
  await page.getByText("I agree that Forge Forward").click();
}

export async function submitDetails(page: Page) {
  await page.getByRole("button", { name: /Next: your video/ }).click();
}

export async function passVideo(page: Page) {
  // Works with the real VideoFlow only when it exposes a dev shortcut; with the dev stub it is one button.
  await expect(page.getByRole("button", { name: "Pretend the video uploaded" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Pretend the video uploaded" }).click();
}
