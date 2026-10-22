import { expect, FUNNEL_PATH, test } from "./fixtures";

test("funnel page sends the security headers", async ({ request }) => {
  const res = await request.get(FUNNEL_PATH);
  expect(res.status()).toBe(200);
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["strict-transport-security"]).toMatch(/max-age=\d{7,}/);
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
});
