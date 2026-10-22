import { describe, expect, it } from "vitest";
import { createMemoryRateLimitStore, takeRateLimit } from "./rate-limit";

const rule = { max: 5, windowMs: 10 * 60_000 };

describe("takeRateLimit", () => {
  it("allows 5 then blocks the 6th", async () => {
    const store = createMemoryRateLimitStore();
    const now = new Date("2026-01-01T00:00:00Z");
    for (let i = 0; i < 5; i++) expect(await takeRateLimit(store, "ip", rule, now)).toBe(true);
    expect(await takeRateLimit(store, "ip", rule, now)).toBe(false);
  });
  it("frees up after the window", async () => {
    const store = createMemoryRateLimitStore();
    const t0 = new Date("2026-01-01T00:00:00Z");
    for (let i = 0; i < 5; i++) await takeRateLimit(store, "ip", rule, t0);
    expect(await takeRateLimit(store, "ip", rule, new Date(t0.getTime() + 10 * 60_000 + 1))).toBe(true);
  });
  it("keeps buckets apart", async () => {
    const store = createMemoryRateLimitStore();
    for (let i = 0; i < 5; i++) await takeRateLimit(store, "a", rule);
    expect(await takeRateLimit(store, "b", rule)).toBe(true);
  });
});
