import { describe, expect, it } from "vitest";
import { isValidCronAuth, rejectUnlessCron } from "./auth";

const secret = "s".repeat(40);

describe("cron auth", () => {
  it("accepts the exact bearer token", () => {
    expect(isValidCronAuth(`Bearer ${secret}`, secret)).toBe(true);
  });
  it("rejects missing, wrong, short and malformed headers", () => {
    expect(isValidCronAuth(null, secret)).toBe(false);
    expect(isValidCronAuth(`Bearer ${"x".repeat(40)}`, secret)).toBe(false);
    expect(isValidCronAuth(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isValidCronAuth(secret, secret)).toBe(false);
    expect(isValidCronAuth("Bearer ", secret)).toBe(false);
  });
  it("rejects everything when no secret is configured", () => {
    expect(isValidCronAuth("Bearer undefined", undefined)).toBe(false);
    expect(isValidCronAuth("Bearer ", "")).toBe(false);
    expect(isValidCronAuth("Bearer short", "short")).toBe(false);
    const weak = "w".repeat(31);
    expect(isValidCronAuth(`Bearer ${weak}`, weak)).toBe(false);
  });
  it("returns 401 from rejectUnlessCron", () => {
    const prev = process.env.CRON_SECRET;
    process.env.CRON_SECRET = secret;
    try {
      expect(rejectUnlessCron(new Request("http://x/api/cron/retention"))?.status).toBe(401);
      const ok = new Request("http://x", { headers: { authorization: `Bearer ${secret}` } });
      expect(rejectUnlessCron(ok)).toBeNull();
    } finally {
      if (prev === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = prev;
    }
  });
});
