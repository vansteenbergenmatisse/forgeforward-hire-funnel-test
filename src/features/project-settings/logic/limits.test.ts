import { describe, expect, it } from "vitest";
import { INTRO_MAX, THANK_YOU_MAX, VIDEO_PROMPT_MAX, countText } from "./limits";

describe("limits", () => {
  it("match the server schema", () => {
    expect([INTRO_MAX, VIDEO_PROMPT_MAX, THANK_YOU_MAX]).toEqual([2000, 600, 1000]);
  });
  it("counts characters", () => {
    expect(countText("abc", 10)).toBe("3 of 10");
  });
});
