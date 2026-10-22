import { defineConfig } from "@playwright/test";

const launchOptions = { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] };

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/dashboard/**", "**/funnel-video/**"],
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3101",
    trace: "retain-on-failure",
    permissions: ["camera", "microphone"],
    launchOptions,
  },
  projects: [
    { name: "phone", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: "laptop", use: { browserName: "chromium", viewport: { width: 1280, height: 800 } } },
  ],
});
