import { describe, expect, it } from "vitest";
import { nextScore, scoreLabel } from "./score";

describe("score", () => {
  it("sets, changes and clears", () => {
    expect(nextScore(null, 4)).toBe(4);
    expect(nextScore(4, 2)).toBe(2);
    expect(nextScore(4, 4)).toBeNull();
  });
  it("labels", () => {
    expect(scoreLabel(null)).toBe("Not scored");
    expect(scoreLabel(4)).toBe("4 of 5");
  });
});
