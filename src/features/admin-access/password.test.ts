import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  // The runner calls timingSafeEqual itself now and then, so only forward real two-argument calls.
  const spy = vi.fn((...args: unknown[]) => (args.length === 2 ? actual.timingSafeEqual(args[0] as Buffer, args[1] as Buffer) : false));
  return { ...actual, timingSafeEqual: spy };
});

import { timingSafeEqual } from "node:crypto";
import { verifyPassword } from "./password";

const PW = "unit-test-password";

beforeEach(() => vi.mocked(timingSafeEqual).mockClear());

describe("verifyPassword", () => {
  it("accepts the right password and rejects a wrong one", () => {
    expect(verifyPassword(PW, PW)).toBe(true);
    expect(verifyPassword("unit-test-passwore", PW)).toBe(false);
  });
  it("rejects an empty try, an unset password and an empty password", () => {
    expect(verifyPassword("", PW)).toBe(false);
    expect(verifyPassword("", "")).toBe(false);
    expect(verifyPassword(PW, undefined)).toBe(false);
    expect(verifyPassword(PW, "")).toBe(false);
  });
  it("handles tries of a different length without throwing", () => {
    expect(verifyPassword("x", PW)).toBe(false);
    expect(verifyPassword(PW.repeat(50), PW)).toBe(false);
    expect(verifyPassword(PW, "x")).toBe(false);
  });
  it("compares with timingSafeEqual on equal-length digests", () => {
    verifyPassword("short", PW);
    verifyPassword(PW.repeat(5), PW);
    const calls = vi.mocked(timingSafeEqual).mock.calls.filter((c) => c.length === 2);
    expect(calls).toHaveLength(2);
    for (const [a, b] of calls) expect((a as Buffer).length).toBe((b as Buffer).length);
  });
  it("does not compare at all when login is off", () => {
    verifyPassword(PW, undefined);
    expect(vi.mocked(timingSafeEqual).mock.calls.filter((c) => c.length === 2)).toHaveLength(0);
  });
});
