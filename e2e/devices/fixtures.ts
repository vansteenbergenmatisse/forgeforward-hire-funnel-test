import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test as base, type Locator, type Page, type TestInfo } from "@playwright/test";

export const FUNNEL_PATH = "/a/appointment-setter";
export const FAKE_APPLICANT = { applicant_id: "00000000-0000-4000-8000-000000000001", resume_token: "device-matrix-fake-token" };

declare global {
  interface Window {
    __csp?: string[];
  }
}

export type Guard = {
  /** Requests to /api/apply/** seen by the browser. */
  seen: string[];
  /** How many of those were answered by a stub in this test. */
  mocked: { count: number };
  /** Requests that tried to reach R2. */
  r2: string[];
  /** Console errors, page errors and CSP violations. */
  issues: string[];
  /** Fulfil one /api/apply route yourself (still counted as mocked). */
  stub: (urlPart: string, status: number, body: unknown) => Promise<void>;
};

const json = (status: number, body: unknown) => ({ status, contentType: "application/json", body: JSON.stringify(body) });

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9+._-]+/g, "_");
}

export function deviceName(info: TestInfo) {
  return info.project.name;
}

/** Saves test-results/devices/<device>/<name>.png */
export async function shot(page: Page, info: TestInfo, name: string, fullPage = true) {
  const dir = path.join("test-results", "devices", sanitize(deviceName(info)));
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage });
}

export type DeviceKind = {
  browser: string;
  touch: boolean;
  mobile: boolean;
  /** Phones and iOS: inputs under 16px make Safari zoom in. */
  zoomRisk: boolean;
  width: number;
  height: number;
};

export function kindOf(info: TestInfo): DeviceKind {
  const u = info.project.use;
  const vp = u.viewport ?? { width: 1280, height: 720 };
  const mobile = !!u.isMobile;
  return {
    browser: u.defaultBrowserType ?? "chromium",
    touch: !!u.hasTouch,
    mobile,
    zoomRisk: mobile && (Math.min(vp.width, vp.height) < 500 || u.defaultBrowserType === "webkit"),
    width: vp.width,
    height: vp.height,
  };
}

/**
 * Every test gets: a guard that answers ALL /api/apply/** requests in the browser (nothing reaches the server),
 * blocks R2, and collects console errors, page errors and CSP violations.
 * Teardown fails the test if a request to /api/apply or R2 got past the guard.
 */
export const test = base.extend<{ guard: Guard }>({
  guard: [
    async ({ page }, use) => {
      const seen: string[] = [];
      const r2: string[] = [];
      const issues: string[] = [];
      const mocked = { count: 0 };

      await page.addInitScript(() => {
        window.__csp = [];
        document.addEventListener("securitypolicyviolation", (e) => {
          window.__csp?.push(`${e.violatedDirective} blocked ${e.blockedURI} at ${e.sourceFile}:${e.lineNumber}:${e.columnNumber} ${e.sample}`);
        });
      });

      page.on("request", (req) => {
        const url = req.url();
        if (url.includes("/api/apply")) seen.push(`${req.method()} ${url}`);
        if (url.includes("r2.cloudflarestorage.com")) r2.push(`${req.method()} ${url}`);
      });
      page.on("console", (msg) => {
        if (msg.type() !== "error") return;
        const loc = msg.location().url;
        // The browser logs every non-2xx response as a console error. Stubbed /api/apply errors are expected.
        if (/Failed to load resource/i.test(msg.text()) && loc.includes("/api/apply")) return;
        issues.push(`console.error: ${msg.text()} (${loc})`);
      });
      page.on("pageerror", (err) => issues.push(`pageerror: ${err.message}`));

      // Generic guard first; later routes win in Playwright, so stubs registered after it take over.
      await page.route("**/api/apply/**", (route) => {
        mocked.count++;
        return route.fulfill({ status: 204 });
      });
      await page.route(/r2\.cloudflarestorage\.com/, (route) => route.abort());

      const stub: Guard["stub"] = async (urlPart, status, body) => {
        await page.route(`**/api/apply/${urlPart}`, (route) => {
          mocked.count++;
          return route.fulfill(json(status, body));
        });
      };

      await use({ seen, mocked, r2, issues, stub });

      expect(r2, "no request may reach R2").toEqual([]);
      expect(seen.length, `every /api/apply request must be stubbed. Seen: ${seen.join(", ")}`).toBe(mocked.count);
    },
    { auto: true },
  ],
});

export { expect };

/** CSP violations recorded in the page since load. */
export async function cspViolations(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__csp ?? []);
}

/** Radios and checkboxes are visually hidden (sr-only) behind a label card, so tap the label like a person would. */
async function tick(input: Locator) {
  await input.locator("xpath=ancestor::label[1]").click();
  await expect(input).toBeChecked();
}

/** Fills the details form with fake data. Reads the live questions, so it works when the project changes. */
export async function fillForm(page: Page) {
  await page.getByLabel("First name", { exact: true }).fill("Device");
  await page.getByLabel("Last name", { exact: true }).fill("Matrix");
  await page.getByLabel("Email", { exact: true }).fill("device.matrix@example.com");
  await page.getByLabel("Phone", { exact: true }).fill("(415) 555-2671");
  await tick(page.locator('[data-field="whatsappOk"] input[type="radio"]').first());
  const questions = page.locator('[data-field^="q:"]');
  const n = await questions.count();
  for (let i = 0; i < n; i++) {
    const q = questions.nth(i);
    const radio = q.locator('input[type="radio"]');
    const checkbox = q.locator('input[type="checkbox"]');
    const text = q.locator('input[type="text"], input:not([type]), textarea');
    if (await radio.count()) await tick(radio.first());
    else if (await checkbox.count()) await tick(checkbox.first());
    else if (await text.count()) await text.first().fill("3");
  }
  await tick(page.locator('[data-field="consent"] input[type="checkbox"]'));
}
