import { describe, expect, it } from "vitest";
import { visibleCards } from "./collapse";

const nums = [1, 2, 3, 4, 5, 6];

describe("visibleCards", () => {
  it("collapses long columns", () => {
    expect(visibleCards(nums, false)).toEqual({ visible: [1, 2, 3, 4], hidden: 2 });
  });
  it("shows everything when expanded", () => {
    expect(visibleCards(nums, true)).toEqual({ visible: nums, hidden: 0 });
  });
  it("does not collapse short columns", () => {
    expect(visibleCards([1, 2, 3, 4], false)).toEqual({ visible: [1, 2, 3, 4], hidden: 0 });
  });
});
