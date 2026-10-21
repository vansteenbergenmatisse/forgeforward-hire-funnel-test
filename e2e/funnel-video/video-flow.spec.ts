import { expect, test } from "@playwright/test";
import { HARNESS, recordFromPrep, recordTake } from "./helpers";

test("retake once, then the retake button is gone", async ({ page }) => {
  await page.goto(HARNESS);
  await recordTake(page);
  await expect(page.getByRole("button", { name: "Retake (1 left)" })).toBeVisible();
  await page.getByRole("button", { name: "Retake (1 left)" }).click();
  await recordFromPrep(page);
  await expect(page.getByRole("button", { name: /Retake/ })).toHaveCount(0);
  await expect(page.getByText("This is your final take.")).toBeVisible();
});

test("no camera falls back to audio only", async ({ page }) => {
  await page.addInitScript(() => {
    const md = navigator.mediaDevices;
    const real = md.getUserMedia.bind(md);
    md.getUserMedia = (c?: MediaStreamConstraints) =>
      c?.video ? Promise.reject(new DOMException("No camera", "NotFoundError")) : real(c);
  });
  await page.goto(HARNESS);
  await page.getByRole("button", { name: "Turn on camera" }).click();
  await expect(page.getByRole("heading", { name: "No camera? No problem" })).toBeVisible();
  await expect(page.getByText("Audio only")).toBeVisible();
});

test("permission denied shows device help and Try again", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Denied", "NotAllowedError"));
  });
  await page.goto(HARNESS);
  await page.getByRole("button", { name: "Turn on camera" }).click();
  await expect(page.getByRole("heading", { name: "Your camera is blocked" })).toBeVisible();
  await page.getByRole("tab", { name: "Android" }).click();
  await expect(page.getByText("Permissions")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("upload fails twice, then works with exactly one completeVideo call", async ({ page }) => {
  await page.goto(`${HARNESS}&sim=fail-upload`);
  await recordTake(page);
  await page.getByRole("button", { name: "Use this video" }).click();
  await expect(page.getByTestId("uploaded")).toBeVisible({ timeout: 45_000 });
  const calls = await page.evaluate(() => window.__videoCalls);
  expect(calls?.completeVideo).toBe(1);
});
