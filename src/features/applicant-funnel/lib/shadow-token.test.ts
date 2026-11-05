import { describe, expect, it } from "vitest";
import { isShadowToken, SHADOW_PREFIX } from "./shadow-token";

describe("isShadowToken", () => {
  it("recognises a shadow token", () => expect(isShadowToken(`${SHADOW_PREFIX}abc.def`)).toBe(true));
  it("does not match a real resume token", () => expect(isShadowToken("Zk3xQ9_-aB1cD2eF3gH4iJ5kL6mN7oP8")).toBe(false));
  it("does not match empty or missing values", () => {
    expect(isShadowToken("")).toBe(false);
    expect(isShadowToken(undefined)).toBe(false);
    expect(isShadowToken(null)).toBe(false);
    expect(isShadowToken("xshadow.abc")).toBe(false);
  });
});
