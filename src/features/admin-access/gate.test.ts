import { describe, expect, it } from "vitest";
import { ADMIN_COOKIE_MAX_AGE, cookieValue, isValidCookie, isValidKey } from "./gate";
import { clearFailures, clientIp, isBlocked, recordFailure } from "./attempts";

const key = "k".repeat(48);

describe("admin gate", () => {
  it("accepts only the exact key", () => {
    expect(isValidKey(key, key)).toBe(true);
    expect(isValidKey("wrong", key)).toBe(false);
    expect(isValidKey(key, undefined)).toBe(false);
  });
  it("cookie is valid for the same key and dies when the key rotates", () => {
    const c = cookieValue(key);
    expect(isValidCookie(c, key)).toBe(true);
    expect(isValidCookie(c, "z".repeat(48))).toBe(false);
    expect(isValidCookie(undefined, key)).toBe(false);
  });
  it("every login gets its own cookie value", () => {
    expect(cookieValue(key)).not.toBe(cookieValue(key));
  });
  it("cookie expires by itself", () => {
    const issued = new Date("2026-01-01T00:00:00Z");
    const c = cookieValue(key, issued);
    expect(isValidCookie(c, key, new Date(issued.getTime() + (ADMIN_COOKIE_MAX_AGE - 60) * 1000))).toBe(true);
    expect(isValidCookie(c, key, new Date(issued.getTime() + (ADMIN_COOKIE_MAX_AGE + 60) * 1000))).toBe(false);
  });
  it("rejects a tampered expiry, id or signature", () => {
    const [exp, id, sig] = cookieValue(key).split(".");
    expect(isValidCookie(`${Number(exp) + 99999}.${id}.${sig}`, key)).toBe(false);
    expect(isValidCookie(`${exp}.${"0".repeat(24)}.${sig}`, key)).toBe(false);
    expect(isValidCookie(`${exp}.${id}.${"0".repeat(64)}`, key)).toBe(false);
    expect(isValidCookie("a.b", key)).toBe(false);
    expect(isValidCookie("", key)).toBe(false);
  });
});

describe("key attempts", () => {
  it("blocks after repeated failures and forgets them after the window", () => {
    const t = 1_000_000;
    for (let i = 0; i < 10; i++) recordFailure("1.2.3.4", t + i);
    expect(isBlocked("1.2.3.4", t + 100)).toBe(true);
    expect(isBlocked("5.6.7.8", t + 100)).toBe(false);
    expect(isBlocked("1.2.3.4", t + 11 * 60_000)).toBe(false);
  });
  it("clears on success", () => {
    for (let i = 0; i < 10; i++) recordFailure("9.9.9.9");
    clearFailures("9.9.9.9");
    expect(isBlocked("9.9.9.9")).toBe(false);
  });
  it("reads the first forwarded address", () => {
    expect(clientIp("203.0.113.5, 10.0.0.1")).toBe("203.0.113.5");
    expect(clientIp(null)).toBe("unknown");
  });
});
