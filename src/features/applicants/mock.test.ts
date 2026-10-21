import { describe, expect, it } from "vitest";
import { MOCK_STAGES } from "@/features/projects";
import { buildMockApplicants } from "./mock";
import { stageCounts, boardCount, didNotFinishCount } from "./stage-counts";

const all = buildMockApplicants();
const as = all.filter((a) => a.projectSlug === "appointment-setter");

describe("mock data", () => {
  it("matches the prototype stage counts", () => {
    const c = stageCounts(as, MOCK_STAGES);
    expect([c["st-new"], c["st-task"], c["st-booked"], c["st-interviewed"], c["st-trial"], c["st-hired"], c["st-rejected"]]).toEqual([9, 5, 3, 2, 1, 1, 3]);
    expect(boardCount(as)).toBe(24);
    expect(didNotFinishCount(as)).toBe(7);
  });
  it("has unique ids and one cancelled booking, one unread reply, one deleted video", () => {
    expect(new Set(all.map((a) => a.id)).size).toBe(all.length);
    expect(as.filter((a) => a.booking?.status === "cancelled")).toHaveLength(1);
    expect(as.filter((a) => a.unreadReply)).toHaveLength(1);
    expect(as.filter((a) => a.media?.deletedAt)).toHaveLength(1);
  });
  it("uses the media files and question id", () => {
    expect(as.find((a) => a.audioOnly)?.media?.src).toBe("/mock/sample-audio.m4a");
    expect(as[0].media?.src).toBe("/mock/sample.mp4");
    expect(as[0].answers["q-years"].value).toBe("3 to 5 years");
  });
});
