import type { Page } from "@playwright/test";
import { cspViolations, expect, fillForm, FAKE_APPLICANT, FUNNEL_PATH, kindOf, shot, test } from "./fixtures";

async function openFunnel(page: Page) {
  const res = await page.goto(FUNNEL_PATH);
  expect(res?.status(), "funnel page status").toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByLabel("First name", { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return res;
}

test("page loads with the form heading and first field, and does not scroll sideways", async ({ page }, info) => {
  await openFunnel(page);
  const w = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth, body: document.body.scrollWidth }));
  expect(w.scroll, `scrollWidth ${w.scroll} > innerWidth ${w.inner}`).toBeLessThanOrEqual(w.inner);
  expect(w.body).toBeLessThanOrEqual(w.inner);
  await shot(page, info, "funnel-form");
  await shot(page, info, "funnel-form-top", false);
});

test("tap targets and input font size", async ({ page }, info) => {
  const kind = kindOf(info);
  await openFunnel(page);
  const found = await page.evaluate(() => {
    const out: { tag: string; label: string; w: number; h: number; inline: boolean; fontSize: number; field: boolean }[] = [];
    const sel = 'button, a[href], input, select, textarea, [role="button"], [role="tab"]';
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      if (el.closest("[inert]") || el.closest("[aria-hidden='true']")) continue;
      if (el instanceof HTMLInputElement && el.type === "hidden") continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      let rect = el.getBoundingClientRect();
      // Radios and checkboxes are hidden behind a label card: the label is the tap target.
      if (el instanceof HTMLInputElement && (el.type === "radio" || el.type === "checkbox") && (rect.width < 24 || rect.height < 24)) {
        const label = el.closest("label");
        if (label) rect = label.getBoundingClientRect();
      }
      if (rect.width === 0 || rect.height === 0) continue;
      const isField = el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;
      out.push({
        tag: el.tagName.toLowerCase() + (el instanceof HTMLInputElement ? `[${el.type}]` : ""),
        label: (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || el.id || "").trim().slice(0, 40),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        // Links inside a sentence are exempt from the tap target rule (WCAG 2.5.8 inline exception).
        inline: el.tagName === "A" && cs.display === "inline",
        fontSize: parseFloat(cs.fontSize),
        field: isField && !(el instanceof HTMLInputElement && ["radio", "checkbox"].includes(el.type)),
      });
    }
    return out;
  });
  expect(found.length).toBeGreaterThan(5);

  if (kind.touch) {
    const small = found.filter((f) => !f.inline && (f.h < 44 || f.w < 44));
    const under48 = found.filter((f) => !f.inline && (f.h < 48 || f.w < 48) && !small.includes(f));
    if (under48.length) {
      info.annotations.push({ type: "below-48px-policy", description: under48.map((f) => `${f.tag} "${f.label}" ${f.w}x${f.h}`).join("; ") });
    }
    expect(small.map((f) => `${f.tag} "${f.label}" ${f.w}x${f.h}`), "tap targets under 44px").toEqual([]);
  }
  if (kind.zoomRisk) {
    const zoomy = found.filter((f) => f.field && f.fontSize < 16);
    expect(zoomy.map((f) => `${f.tag} "${f.label}" ${f.fontSize}px`), "inputs under 16px (iOS zooms in)").toEqual([]);
  }
});

test("the main button is not clipped by the toolbar, notch or 100vh", async ({ page }, info) => {
  await openFunnel(page);
  const button = page.getByRole("button", { name: /Next: your video/ });
  await button.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(button).toBeVisible();
  const r = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Next: your video/.test(x.textContent ?? ""));
    if (!b) return null;
    const rect = b.getBoundingClientRect();
    const vv = window.visualViewport;
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, h: vv?.height ?? window.innerHeight, w: vv?.width ?? window.innerWidth, hit: !!top && b.contains(top) };
  });
  expect(r).not.toBeNull();
  expect(r!.top, "button top above the viewport").toBeGreaterThanOrEqual(0);
  expect(r!.bottom, `button bottom ${r!.bottom} below viewport height ${r!.h}`).toBeLessThanOrEqual(r!.h + 0.5);
  expect(r!.left).toBeGreaterThanOrEqual(0);
  expect(r!.right).toBeLessThanOrEqual(r!.w + 0.5);
  expect(r!.hit, "something covers the button").toBe(true);
  await shot(page, info, "funnel-bottom", false);
});

test("no console errors, no CSP violations, brand fonts loaded", async ({ page, guard }) => {
  await openFunnel(page);
  // Touch the form a little so lazy code runs too.
  await page.getByLabel("First name", { exact: true }).fill("Test");
  await page.getByLabel("First name", { exact: true }).blur();
  expect(await cspViolations(page), "CSP violations").toEqual([]);
  expect(guard.issues, "console and page errors").toEqual([]);

  const fonts = await page.evaluate(() => {
    const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, "").replace(/_/g, " "));
    const h1 = getComputedStyle(document.querySelector("h1")!).fontFamily;
    const body = getComputedStyle(document.body).fontFamily;
    return { loaded, h1, body };
  });
  expect(fonts.loaded.some((f) => /Barlow Condensed/i.test(f)), `Barlow Condensed not loaded. Loaded: ${fonts.loaded.join(", ")}`).toBe(true);
  expect(fonts.loaded.some((f) => /^Inter(?! Fallback)/i.test(f)), `Inter not loaded. Loaded: ${fonts.loaded.join(", ")}`).toBe(true);
  expect(fonts.h1).toMatch(/Barlow/i);
  expect(fonts.body).toMatch(/Inter/i);
});

test("a failing start call shows a clear error and keeps the form (stubbed 500, nothing is created)", async ({ page, guard }, info) => {
  await guard.stub("start", 500, { error: "boom" });
  await openFunnel(page);
  await fillForm(page);
  await page.getByRole("button", { name: /Next: your video/ }).click();
  const alert = page.getByRole("alert").filter({ hasText: /went wrong|try again/i });
  await expect(alert).toBeVisible();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Device");
  await shot(page, info, "funnel-server-error");
  expect(guard.seen.some((s) => s.includes("/api/apply/start"))).toBe(true);
});

test("form advances to the video step with a stubbed start call, camera behaves per browser", async ({ page, guard }, info) => {
  const kind = kindOf(info);
  if (kind.browser === "webkit") {
    // WebKit has no fake camera. Prove the denied path instead (patch the prototype: WebKit ignores instance patches).
    await page.addInitScript(() => {
      MediaDevices.prototype.getUserMedia = () => Promise.reject(new DOMException("Denied", "NotAllowedError"));
    });
  }
  await guard.stub("start", 200, FAKE_APPLICANT);
  await openFunnel(page);
  await fillForm(page);
  await page.getByRole("button", { name: /Next: your video/ }).click();

  await expect(page.getByRole("heading", { level: 1, name: /Next: a \d+ second video/ })).toBeVisible();
  const start = page.getByRole("button", { name: "Turn on camera" });
  await expect(start).toBeVisible();
  await shot(page, info, "video-1-allow");
  await start.click();

  if (kind.browser === "webkit") {
    await expect(page.getByRole("heading", { name: "Your camera is blocked" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await shot(page, info, "video-2-denied");
  } else {
    await expect(page.getByRole("heading", { name: /Looking good|No camera\? No problem/ })).toBeVisible({ timeout: 25_000 });
    await shot(page, info, "video-2-check");
    await page.getByRole("button", { name: "Continue" }).click();
    const ready = page.getByRole("button", { name: "I'm ready" });
    await expect(ready).toBeVisible();
    await shot(page, info, "video-3-prep");
    await ready.click();
    // Countdown, then the recording screen with the record button (Finish) and the clock. Nothing is uploaded.
    const finish = page.getByRole("button", { name: "Finish" });
    await expect(finish).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/\d:\d{2}\s+left/)).toBeVisible();
    await shot(page, info, "video-4-recording");
  }
  expect(guard.issues, "console and page errors").toEqual([]);
});
