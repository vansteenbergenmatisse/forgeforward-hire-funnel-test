import { describe, expect, it } from "vitest";
import { APPLICANT_RETENTION_DAYS, applicantFolders, daysUntilDeletion, isRetentionEligible, mediaKeys, ownFolders, retentionClock, retentionCutoff, type RetentionSubject } from "./rules";

const now = new Date("2026-10-21T03:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

const base: RetentionSubject = {
  createdAt: daysAgo(31),
  stageIsPositive: false,
};

describe("retention eligibility", () => {
  it("uses a named 30 day constant", () => {
    expect(APPLICANT_RETENTION_DAYS).toBe(30);
  });
  it("is eligible 31 days after creation in a non-positive stage (New, Did task, Rejected, custom)", () => {
    expect(isRetentionEligible(base, now)).toBe(true);
  });
  it("keeps applicants younger than 30 days, and exactly 30 days", () => {
    expect(isRetentionEligible({ ...base, createdAt: daysAgo(29) }, now)).toBe(false);
    expect(isRetentionEligible({ ...base, createdAt: retentionCutoff(now) }, now)).toBe(false);
  });
  it("never deletes in a positive stage, however old", () => {
    expect(isRetentionEligible({ ...base, createdAt: daysAgo(400), stageIsPositive: true }, now)).toBe(false);
  });
  it("counts Did not finish applicants (no stage) as not positive", () => {
    expect(isRetentionEligible({ ...base, stageIsPositive: null }, now)).toBe(true);
    expect(isRetentionEligible({ ...base, stageIsPositive: null, createdAt: daysAgo(5) }, now)).toBe(false);
  });
  it("starts the clock at the last stage change, so a card moved today into Rejected gets 30 more days", () => {
    const moved = { ...base, createdAt: daysAgo(90), lastStageChangeAt: now, lastStageEventAt: now };
    expect(isRetentionEligible(moved, now)).toBe(false);
    expect(isRetentionEligible(moved, new Date(now.getTime() + 29 * 86_400_000))).toBe(false);
    expect(isRetentionEligible(moved, new Date(now.getTime() + 31 * 86_400_000))).toBe(true);
  });
  it("uses the latest of the column and the stage_changed event", () => {
    expect(isRetentionEligible({ ...base, lastStageChangeAt: daysAgo(40), lastStageEventAt: daysAgo(10) }, now)).toBe(false);
    expect(isRetentionEligible({ ...base, lastStageChangeAt: daysAgo(10), lastStageEventAt: null }, now)).toBe(false);
    expect(isRetentionEligible({ ...base, lastStageChangeAt: daysAgo(35), lastStageEventAt: daysAgo(33) }, now)).toBe(true);
  });
  it("falls back to completion, then creation, when no stage change exists", () => {
    expect(retentionClock({ createdAt: daysAgo(50), completedAt: daysAgo(10) }).getTime()).toBe(daysAgo(10).getTime());
    expect(retentionClock({ createdAt: daysAgo(50) }).getTime()).toBe(daysAgo(50).getTime());
  });
  it("is no longer eligible once moved out of Rejected into a positive stage", () => {
    const old = { ...base, createdAt: daysAgo(90) };
    expect(isRetentionEligible({ ...old, stageIsPositive: false }, now)).toBe(true);
    expect(isRetentionEligible({ ...old, stageIsPositive: true }, now)).toBe(false);
  });
  it("lists only the keys that exist", () => {
    expect(mediaKeys({ videoKey: "videos/a.webm", thumbKey: "thumbs/a.jpg", taskFileKey: null })).toEqual(["videos/a.webm", "thumbs/a.jpg"]);
    expect(mediaKeys({ videoKey: "", thumbKey: null, taskFileKey: "t/x.pdf" })).toEqual(["t/x.pdf"]);
  });
});

describe("daysUntilDeletion", () => {
  const s = { stageIsPositive: false as boolean | null };
  it("shows nothing before day 25", () => {
    expect(daysUntilDeletion({ ...s, createdAt: daysAgo(24) }, now)).toBeNull();
  });
  it("counts down from day 25 since the last stage change", () => {
    expect(daysUntilDeletion({ ...s, createdAt: daysAgo(25) }, now)).toBe(5);
    expect(daysUntilDeletion({ ...s, createdAt: daysAgo(40) }, now)).toBe(0);
    expect(daysUntilDeletion({ ...s, createdAt: daysAgo(40), lastStageChangeAt: daysAgo(26) }, now)).toBe(4);
  });
  it("shows nothing for protected cards", () => {
    expect(daysUntilDeletion({ ...s, stageIsPositive: true, createdAt: daysAgo(27) }, now)).toBeNull();
  });
});

describe("applicantFolders", () => {
  it("returns only folders whose last segment is the applicant id", () => {
    const keys = ["test/videos/s/a1/1.webm", "test/thumbs/s/a1/1.jpg", "test/tasks/s/a1/x-cv.pdf", "videos/s/other/2.webm", "loose.webm"];
    expect(applicantFolders("a1", keys).sort()).toEqual(["test/tasks/s/a1/", "test/thumbs/s/a1/", "test/videos/s/a1/"]);
  });
});

describe("ownFolders", () => {
  const id = "0b9c4a52-7d1e-4f3a-9c55-1a2b3c4d5e6f";
  it("builds the three folders of one applicant", () => {
    expect(ownFolders("test/", "setter", id)).toEqual([`test/videos/setter/${id}/`, `test/thumbs/setter/${id}/`, `test/tasks/setter/${id}/`]);
  });
  it("refuses an id or slug that could widen the delete", () => {
    expect(ownFolders("", "setter", "")).toEqual([]);
    expect(ownFolders("", "setter", "../x")).toEqual([]);
    expect(ownFolders("", "setter", `${id}/`)).toEqual([]);
    expect(ownFolders("", "a/b", id)).toEqual([]);
    expect(ownFolders("", "", id)).toEqual([]);
    expect(ownFolders("", "..", id)).toEqual([]);
  });
});
