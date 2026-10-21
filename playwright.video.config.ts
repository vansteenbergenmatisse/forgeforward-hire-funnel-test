import { defineConfig, devices } from "@playwright/test";

// Video flow specs. Needs a dev server on port 3104: NEXT_DIST_DIR=.next-d pnpm exec next dev -p 3104
export default defineConfig({
  testDir: "./e2e/funnel-video",
  timeout: 90_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3104",
    permissions: ["camera", "microphone"],
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
    launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
  },
  projects: [{ name: "chromium", use: {} }],
});
