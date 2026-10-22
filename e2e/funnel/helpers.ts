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

/**
 * Real-API runs only: the browser PUTs the stub video straight to R2, which allows only the origins in the bucket CORS rule.
 * This fetches the PUT outside the browser and answers with CORS headers, so any local port works. Unused in mock mode.
 */
export async function allowR2Puts(page: Page) {
  await page.route(/r2\.cloudflarestorage\.com/, async (route) => {
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "PUT,GET,OPTIONS" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const res = await route.fetch();
    await route.fulfill({ response: res, headers: { ...res.headers(), ...cors } });
  });
}

/** Distinct applicant ids returned by /api/apply/start. Empty in mock mode (no network calls). */
export function trackStarts(page: Page): Set<string> {
  const ids = new Set<string>();
  page.on("response", async (res) => {
    if (res.url().endsWith("/api/apply/start") && res.ok()) {
      const body = (await res.json().catch(() => null)) as { applicant_id?: string } | null;
      if (body?.applicant_id) ids.add(body.applicant_id);
    }
  });
  return ids;
}
