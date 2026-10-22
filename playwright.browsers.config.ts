import { defineConfig, devices } from "@playwright/test";

// Funnel specs on more browsers. Needs a dev server on port 3101 (test database).
const chromiumArgs = { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] };

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/dashboard/**", "**/funnel-video/**"],
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3101",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 15"] } },
    { name: "pixel", use: { ...devices["Pixel 7"], permissions: ["camera", "microphone"], launchOptions: chromiumArgs } },
    { name: "firefox-mobile", use: { browserName: "firefox", viewport: { width: 390, height: 844 } } },
    { name: "safari-desktop", use: { browserName: "webkit", viewport: { width: 1280, height: 800 } } },
  ],
});
