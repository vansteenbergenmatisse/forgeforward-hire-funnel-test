import { defineConfig, devices } from "@playwright/test";

// Dashboard specs (http mode, test database, test/ R2 prefix). Start the server first:
//   pnpm exec tsx scripts/e2e-dashboard-server.ts        (port 3210, dist dir .next-int)
// Then: pnpm exec playwright test -c playwright.dashboard.config.ts
// The server script sets a throwaway admin key and Cal.com secret; the specs read the same defaults.
export default defineConfig({
  testDir: "./e2e/dashboard",
  timeout: 90_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3210",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: "chromium", use: {} }],
});
