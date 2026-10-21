import { describe, expect, it } from "vitest";
import { CHECK_IDS } from "./types";
import { checkDuration } from "./timing";

describe("checkDuration", () => {
  it("stays inside the range for every check", () => {
    for (const id of CHECK_IDS) {
      const lo = checkDuration(id, () => 0);
      const hi = checkDuration(id, () => 0.999999);
      expect(lo).toBeGreaterThan(0);
      expect(hi).toBeGreaterThanOrEqual(lo);
    }
  });
  it("makes the upload the slowest check", () => {
    expect(checkDuration("upload", () => 0)).toBeGreaterThan(checkDuration("db", () => 0.999));
  });
});
