import { defineConfig, devices } from "@playwright/test";

// Video flow specs on more browsers. Needs a dev server on port 3104 (test database).
// WebKit has no fake camera switch, so the WebKit projects are only meaningful if getUserMedia works there.
const chromiumArgs = { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] };
const firefoxUserPrefs = { "media.navigator.streams.fake": true, "media.navigator.permission.disabled": true };

export default defineConfig({
  testDir: "./e2e/funnel-video",
  timeout: 90_000,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3104", trace: "retain-on-failure" },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 15"], permissions: ["camera", "microphone"] } },
    { name: "pixel", use: { ...devices["Pixel 7"], permissions: ["camera", "microphone"], launchOptions: chromiumArgs } },
    { name: "firefox-mobile", use: { browserName: "firefox", viewport: { width: 390, height: 844 }, launchOptions: { firefoxUserPrefs } } },
    { name: "safari-desktop", use: { browserName: "webkit", viewport: { width: 1280, height: 800 }, permissions: ["camera", "microphone"] } },
  ],
});
