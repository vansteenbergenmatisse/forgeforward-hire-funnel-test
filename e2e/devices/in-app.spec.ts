import { expect, FUNNEL_PATH, shot, test as base } from "./fixtures";

const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 [FBAN/FBIOS;FBAV/460.0.0.0.0;FBBV/600000000;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]";
const ANDROID = "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/460.0.0.0.0;]";
const IG_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 Instagram 330.0.0.20.113 (iPhone15,2; iOS 17_5; en_US; en; scale=3.00; 1179x2556; 560000000)";
const IG_ANDROID = "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 Instagram 330.0.0.20.113 Android (33/13; 420dpi; 1080x2400; Google/google; Pixel 7; panther; panther; en_US; 600000000)";

for (const [app, ios, android] of [
  ["Facebook", IOS, ANDROID],
  ["Instagram", IG_IOS, IG_ANDROID],
] as const) {
  base.describe(`${app} in-app browser`, () => {
    base.beforeEach(({}, info) => {
      base.skip(!info.project.use.isMobile, "in-app browsers only exist on phones and tablets");
    });
    const test = base.extend({
      userAgent: async ({ browserName }, provide) => provide(browserName === "webkit" ? ios : android),
    });

    test("shows the open-in-your-browser guidance", async ({ page, browserName }, info) => {
      await page.goto(FUNNEL_PATH);
      await expect(page.getByRole("heading", { name: "Open this in your browser" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Continue here anyway" })).toBeVisible();
      if (browserName !== "webkit") await expect(page.getByRole("link", { name: "Open in Chrome" })).toBeVisible();
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(w[0]).toBeLessThanOrEqual(w[1]);
      await shot(page, info, `inapp-${app.toLowerCase()}`);
    });
  });
}
