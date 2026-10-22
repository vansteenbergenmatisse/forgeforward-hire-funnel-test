import { describe, expect, it } from "vitest";
import { MOCK_STAGES } from "@/features/projects";
import { daysUntilDeletion, videoDeletesInDays, warnOnMoveOutOfPositive, retentionBadgeText } from "./retention";

const now = new Date("2026-10-21T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

describe("retention", () => {
  it("counts down the 30 day rule", () => {
    expect(daysUntilDeletion({ createdAt: daysAgo(10), stageId: "st-new" }, MOCK_STAGES, now)).toBe(20);
    expect(daysUntilDeletion({ createdAt: daysAgo(40), stageId: "st-new" }, MOCK_STAGES, now)).toBe(0);
  });
  it("starts the clock at the last stage change", () => {
    expect(daysUntilDeletion({ createdAt: daysAgo(90), lastStageChangeAt: daysAgo(0), stageId: "st-rejected" }, MOCK_STAGES, now)).toBe(30);
    expect(daysUntilDeletion({ createdAt: daysAgo(90), lastStageChangeAt: daysAgo(12), stageId: "st-rejected" }, MOCK_STAGES, now)).toBe(18);
  });
  it("never deletes in positive stages", () => {
    expect(daysUntilDeletion({ createdAt: daysAgo(40), stageId: "st-hired" }, MOCK_STAGES, now)).toBeNull();
  });
  it("counts did-not-finish cards", () => {
    expect(daysUntilDeletion({ createdAt: daysAgo(28), stageId: null }, MOCK_STAGES, now)).toBe(2);
  });
  it("shows the badge only from day 25", () => {
    expect(videoDeletesInDays({ createdAt: daysAgo(24), stageId: "st-new" }, MOCK_STAGES, now)).toBeNull();
    expect(videoDeletesInDays({ createdAt: daysAgo(25), stageId: "st-new" }, MOCK_STAGES, now)).toBe(5);
    expect(videoDeletesInDays({ createdAt: daysAgo(27), stageId: "st-rejected" }, MOCK_STAGES, now)).toBe(3);
    expect(videoDeletesInDays({ createdAt: daysAgo(40), lastStageChangeAt: daysAgo(1), stageId: "st-rejected" }, MOCK_STAGES, now)).toBeNull();
  });
  it("formats the badge", () => {
    expect(retentionBadgeText(1)).toBe("Deletes in 1 day");
    expect(retentionBadgeText(3)).toBe("Deletes in 3 days");
  });
  it("warns with 30 days when a card leaves a positive stage for one that is not", () => {
    const card = { createdAt: daysAgo(10), stageId: "st-trial" };
    expect(warnOnMoveOutOfPositive(card, "st-rejected", MOCK_STAGES)).toBe(30);
    expect(warnOnMoveOutOfPositive(card, "st-hired", MOCK_STAGES)).toBeNull();
    expect(warnOnMoveOutOfPositive({ ...card, stageId: "st-new" }, "st-rejected", MOCK_STAGES)).toBeNull();
  });
});
