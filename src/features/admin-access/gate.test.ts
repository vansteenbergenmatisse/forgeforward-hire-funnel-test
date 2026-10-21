import { describe, expect, it } from "vitest";
import { cookieValue, isValidCookie, isValidKey } from "./gate";

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
});
