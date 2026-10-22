import { defineConfig } from "@playwright/test";
import { deviceProjects } from "./e2e/devices-e2e/devices";
import { BASE_URL } from "./e2e/devices-e2e/env";

// REAL end-to-end check per device and browser against a deployed site (default production).
// Every applicant is flagged is_test with the signed test-console header and removed in the global teardown.
// Needs ADMIN_KEY and ADMIN_PASSWORD (environment or .env.local). Optional: DATABASE_URL_UNPOOLED of the target
// database (or E2E_DB_ENV_FILE) for the direct row checks. Run: pnpm test:e2e:devices
export default defineConfig({
  testDir: "./e2e/devices-e2e",
  testMatch: /.*\.spec\.ts/,
  globalSetup: "./e2e/devices-e2e/global-setup.ts",
  globalTeardown: "./e2e/devices-e2e/global-teardown.ts",
  timeout: 240_000,
  expect: { timeout: 20_000 },
  workers: Number(process.env.E2E_WORKERS || 2),
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-devices-e2e" }]],
  outputDir: "test-results-devices-e2e",
  use: {
    baseURL: BASE_URL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: deviceProjects,
});
