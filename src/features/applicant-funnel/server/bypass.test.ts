import { describe, expect, it } from "vitest";
import { isTestConsole, signTestConsole } from "./bypass";

const key = "k".repeat(48);

describe("test console header", () => {
  it("accepts a fresh signed value", () => {
    expect(isTestConsole(signTestConsole(key), key)).toBe(true);
  });
  it("is valid for 30 seconds only", () => {
    const t = Date.now();
    expect(isTestConsole(signTestConsole(key, t - 20_000), key, t)).toBe(true);
    expect(isTestConsole(signTestConsole(key, t - 40_000), key, t)).toBe(false);
  });
  it("rejects a wrong key, a stale value and junk", () => {
    expect(isTestConsole(signTestConsole("z".repeat(48)), key)).toBe(false);
    expect(isTestConsole(signTestConsole(key, Date.now() - 10 * 60_000), key)).toBe(false);
    expect(isTestConsole("abc", key)).toBe(false);
    expect(isTestConsole(null, key)).toBe(false);
    expect(isTestConsole(signTestConsole(key), undefined)).toBe(false);
  });
});
