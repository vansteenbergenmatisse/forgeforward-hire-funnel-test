import { describe, expect, it } from "vitest";
import { shouldGrabThumb } from "./thumbnail";

describe("shouldGrabThumb", () => {
  it("waits for 2 seconds", () => {
    expect(shouldGrabThumb(1999, false)).toBe(false);
    expect(shouldGrabThumb(2000, false)).toBe(true);
  });
  it("only grabs once", () => {
    expect(shouldGrabThumb(5000, true)).toBe(false);
  });
});
