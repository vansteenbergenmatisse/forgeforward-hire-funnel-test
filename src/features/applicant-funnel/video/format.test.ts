import { describe, expect, it } from "vitest";
import { formatClock } from "./format";

describe("formatClock", () => {
  it("formats", () => {
    expect(formatClock(42)).toBe("0:42");
    expect(formatClock(75)).toBe("1:15");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-3)).toBe("0:00");
    expect(formatClock(41.2)).toBe("0:42");
  });
});
