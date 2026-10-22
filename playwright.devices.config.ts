import { defineConfig, devices } from "@playwright/test";
import type { Project } from "@playwright/test";

/**
 * Device matrix, READ-ONLY. Default target is the live site; override with E2E_BASE_URL.
 * Run: pnpm test:devices  (or pnpm test:devices:local against a dev server on port 3101).
 * Writes nothing to the target: /api/apply/** is intercepted in the browser (see e2e/devices/fixtures.ts).
 * Screenshots: test-results/devices/<device>/<page>.png
 */
export const DEFAULT_BASE_URL = "https://apply.forgeforward.io";

// Descriptor names that do not exist in the installed @playwright/test are skipped.
const NAMES = [
  "iPhone SE",
  "iPhone 12",
  "iPhone 13",
  "iPhone 14 Pro Max",
  "iPhone 15",
  "iPhone 15 landscape",
  "iPhone 15 Pro Max",
  "iPad (gen 7)",
  "iPad Pro 11",
  "Pixel 5",
  "Pixel 7",
  "Galaxy S9+",
  "Galaxy S8",
  "Galaxy S8 landscape",
  "Galaxy Tab S4",
  "Desktop Chrome",
  "Desktop Firefox",
  "Desktop Safari",
] as const;

const chromiumArgs = ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"];
const firefoxUserPrefs = {
  "media.navigator.streams.fake": true,
  "media.navigator.permission.disabled": true,
};

type Descriptor = (typeof devices)[string];

function launchFor(browser: Descriptor["defaultBrowserType"]) {
  if (browser === "chromium") return { args: chromiumArgs };
  if (browser === "firefox") return { firefoxUserPrefs };
  return {};
}

function projectFor(name: string, d: Descriptor): Project {
  return {
    name,
    use: {
      ...d,
      // Chromium and Firefox get a fake camera and mic. WebKit has none; its camera specs check the denied path.
      launchOptions: launchFor(d.defaultBrowserType),
      // Firefox gets its fake media from firefoxUserPrefs, and WebKit rejects the permission names.
      permissions: d.defaultBrowserType === "chromium" ? ["camera", "microphone"] : [],
    },
  };
}

const projects: Project[] = [];
for (const name of NAMES) {
  const d = devices[name];
  if (d) projects.push(projectFor(name, d));
  else console.warn(`[devices] descriptor "${name}" not found in this Playwright version, skipped`);
}
// A tiny phone that is not a named device: 320 x 568, touch, Chromium.
projects.push(
  projectFor("Tiny phone 320x568", {
    ...devices["Pixel 5"],
    viewport: { width: 320, height: 568 },
  }),
);

export default defineConfig({
  testDir: "./e2e/devices",
  outputDir: "test-results/devices-runs",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "test-results/devices-report" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? DEFAULT_BASE_URL,
    trace: "retain-on-failure",
  },
  projects,
});
