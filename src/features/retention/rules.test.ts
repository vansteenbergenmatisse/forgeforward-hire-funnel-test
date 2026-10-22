import { describe, expect, it } from "vitest";
import { applicantFolders, daysUntilDeletion, isRetentionEligible, mediaKeys, ownFolders, retentionCutoff, type RetentionSubject } from "./rules";

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
  it("skips applicants that are already deleted", () => {
    expect(isRetentionEligible({ ...base, videoDeletedAt: daysAgo(1) }, now)).toBe(false);
  });
  it("includes applicants who never finished a video, so their stray uploads get swept", () => {
    expect(isRetentionEligible({ ...base, videoKey: null, thumbKey: null }, now)).toBe(true);
    expect(isRetentionEligible({ ...base, videoKey: null, thumbKey: null, createdAt: daysAgo(5) }, now)).toBe(false);
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
