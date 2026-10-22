import { describe, expect, it } from "vitest";
import { moveOutOfKeptWarning, stopKeepingWarning } from "./retention-warning";

const kept = { name: "Hired", isPositive: true };
const normal = { name: "New", isPositive: false };

describe("stopKeepingWarning", () => {
  it("warns with the number of cards", () => {
    expect(stopKeepingWarning(kept, 3)).toContain("3 cards in Hired");
    expect(stopKeepingWarning(kept, 1)).toContain("1 card in Hired");
  });
  it("is silent when nothing is at risk", () => {
    expect(stopKeepingWarning(kept, 0)).toBeNull();
    expect(stopKeepingWarning(normal, 5)).toBeNull();
  });
});

describe("moveOutOfKeptWarning", () => {
  it("warns when cards leave a kept stage for one that does not keep videos", () => {
    expect(moveOutOfKeptWarning(kept, normal, 2)).toContain("2 cards from Hired");
  });
  it("is silent for a kept target, no cards or an unkept source", () => {
    expect(moveOutOfKeptWarning(kept, kept, 2)).toBeNull();
    expect(moveOutOfKeptWarning(kept, normal, 0)).toBeNull();
    expect(moveOutOfKeptWarning(normal, normal, 2)).toBeNull();
  });
});
