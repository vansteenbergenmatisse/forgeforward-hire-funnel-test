import { describe, expect, it } from "vitest";
import { callbackOrigin } from "./context";

describe("callbackOrigin", () => {
  it("uses the configured APP_URL, not the request host", () => {
    expect(callbackOrigin("https://evil.example", "https://apply.example.io/some/path")).toBe("https://apply.example.io");
  });
  it("falls back to the request origin without APP_URL or with a bad one", () => {
    expect(callbackOrigin("http://localhost:3101", undefined)).toBe("http://localhost:3101");
    expect(callbackOrigin("http://localhost:3101", "  ")).toBe("http://localhost:3101");
    expect(callbackOrigin("http://localhost:3101", "not a url")).toBe("http://localhost:3101");
  });
});
