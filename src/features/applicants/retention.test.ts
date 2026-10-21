import { describe, expect, it } from "vitest";
import { MOCK_STAGES } from "@/features/projects";
import { daysUntilDeletion, videoDeletesInDays, warnOnMoveOutOfPositive, retentionBadgeText } from "./retention";

const now = new Date("2026-10-21T12:00:00Z");
const media = { kind: "video" as const, src: "/x.mp4", seconds: 50, bytes: 1, deletedAt: null };
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

describe("retention", () => {
  it("counts down the 30 day rule", () => {
    expect(daysUntilDeletion({ createdAt: daysAgo(10), stageId: "st-new", media }, MOCK_STAGES, now)).toBe(20);
    expect(daysUntilDeletion({ createdAt: daysAgo(40), stageId: "st-new", media }, MOCK_STAGES, now)).toBe(0);
  });
  it("never deletes in positive stages", () => {
    expect(daysUntilDeletion({ createdAt: daysAgo(40), stageId: "st-hired", media }, MOCK_STAGES, now)).toBeNull();
  });
  it("counts did-not-finish cards", () => {
    expect(daysUntilDeletion({ createdAt: daysAgo(28), stageId: null, media }, MOCK_STAGES, now)).toBe(2);
  });
  it("ignores missing or deleted media", () => {
    expect(daysUntilDeletion({ createdAt: daysAgo(28), stageId: "st-new", media: null }, MOCK_STAGES, now)).toBeNull();
    expect(daysUntilDeletion({ createdAt: daysAgo(28), stageId: "st-new", media: { ...media, deletedAt: daysAgo(1) } }, MOCK_STAGES, now)).toBeNull();
  });
  it("shows the badge only from day 25", () => {
    expect(videoDeletesInDays({ createdAt: daysAgo(24), stageId: "st-new", media }, MOCK_STAGES, now)).toBeNull();
    expect(videoDeletesInDays({ createdAt: daysAgo(25), stageId: "st-new", media }, MOCK_STAGES, now)).toBe(5);
    expect(videoDeletesInDays({ createdAt: daysAgo(27), stageId: "st-rejected", media }, MOCK_STAGES, now)).toBe(3);
  });
  it("formats the badge", () => {
    expect(retentionBadgeText(1)).toBe("Video deletes in 1 day");
    expect(retentionBadgeText(3)).toBe("Video deletes in 3 days");
  });
  it("warns when an old card leaves a positive stage", () => {
    const old = { createdAt: daysAgo(27), stageId: "st-trial", media };
    expect(warnOnMoveOutOfPositive(old, "st-rejected", MOCK_STAGES, now)).toBe(3);
    expect(warnOnMoveOutOfPositive(old, "st-hired", MOCK_STAGES, now)).toBeNull();
    expect(warnOnMoveOutOfPositive({ ...old, createdAt: daysAgo(10) }, "st-rejected", MOCK_STAGES, now)).toBeNull();
    expect(warnOnMoveOutOfPositive({ ...old, stageId: "st-new" }, "st-rejected", MOCK_STAGES, now)).toBeNull();
  });
});
