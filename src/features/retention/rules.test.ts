import { describe, expect, it } from "vitest";
import { daysUntilDeletion, isRetentionEligible, mediaKeys, retentionCutoff, type RetentionSubject } from "./rules";

const now = new Date("2026-10-21T03:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

const base: RetentionSubject = {
  createdAt: daysAgo(31),
  stageIsPositive: false,
  videoDeletedAt: null,
  videoKey: "videos/a.webm",
  thumbKey: "thumbs/a.jpg",
  taskFileKey: null,
};

describe("retention eligibility", () => {
  it("deletes media older than 30 days outside a positive stage", () => {
    expect(isRetentionEligible(base, now)).toBe(true);
  });
  it("keeps media of applicants younger than 30 days", () => {
    expect(isRetentionEligible({ ...base, createdAt: daysAgo(29) }, now)).toBe(false);
    expect(isRetentionEligible({ ...base, createdAt: retentionCutoff(now) }, now)).toBe(false);
  });
  it("keeps media in a positive stage, and checks again once the card moves out", () => {
    expect(isRetentionEligible({ ...base, stageIsPositive: true }, now)).toBe(false);
    expect(isRetentionEligible({ ...base, stageIsPositive: false }, now)).toBe(true);
  });
  it("counts Did not finish applicants (no stage) as not positive", () => {
    expect(isRetentionEligible({ ...base, stageIsPositive: null }, now)).toBe(true);
  });
  it("skips applicants that are already deleted or have no files", () => {
    expect(isRetentionEligible({ ...base, videoDeletedAt: daysAgo(1) }, now)).toBe(false);
    expect(isRetentionEligible({ ...base, videoKey: null, thumbKey: null }, now)).toBe(false);
  });
  it("lists only the keys that exist", () => {
    expect(mediaKeys(base)).toEqual(["videos/a.webm", "thumbs/a.jpg"]);
    expect(mediaKeys({ videoKey: "", thumbKey: null, taskFileKey: "t/x.pdf" })).toEqual(["t/x.pdf"]);
  });
});

describe("daysUntilDeletion", () => {
  const s = { stageIsPositive: false as boolean | null, videoDeletedAt: null };
  it("shows nothing before day 25", () => {
    expect(daysUntilDeletion({ ...s, createdAt: daysAgo(24) }, now)).toBeNull();
  });
  it("counts down from day 25", () => {
    expect(daysUntilDeletion({ ...s, createdAt: daysAgo(25) }, now)).toBe(5);
    expect(daysUntilDeletion({ ...s, createdAt: daysAgo(29) }, now)).toBe(1);
    expect(daysUntilDeletion({ ...s, createdAt: daysAgo(40) }, now)).toBe(0);
  });
  it("shows nothing for protected or already deleted cards", () => {
    expect(daysUntilDeletion({ ...s, stageIsPositive: true, createdAt: daysAgo(27) }, now)).toBeNull();
    expect(daysUntilDeletion({ ...s, videoDeletedAt: daysAgo(1) as unknown as null, createdAt: daysAgo(27) }, now)).toBeNull();
  });
});
