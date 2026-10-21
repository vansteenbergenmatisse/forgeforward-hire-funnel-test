import { describe, expect, it } from "vitest";
import { LINK_PROTOCOLS, normalizeUrl } from "./url";

describe("normalizeUrl", () => {
  it("adds https when the scheme is missing", () => expect(normalizeUrl("example.com/a")).toBe("https://example.com/a"));
  it("keeps http and https", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com/");
    expect(normalizeUrl("https://example.com/x?y=1")).toBe("https://example.com/x?y=1");
  });
  it("rejects dangerous or odd input", () => {
    for (const v of ["javascript:alert(1)", "data:text/html,hi", "", "  ", "two words.com", "localhost", "ftp://example.com"]) expect(normalizeUrl(v)).toBeNull();
  });
  it("allows mailto and tel only when asked", () => {
    expect(normalizeUrl("mailto:a@b.co")).toBeNull();
    expect(normalizeUrl("mailto:a@b.co", LINK_PROTOCOLS)).toBe("mailto:a@b.co");
  });
});
