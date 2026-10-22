import { describe, expect, it } from "vitest";
import { MOCK_STAGES } from "@/features/projects";
import type { ApplicantView } from "@/features/applicants";
import { bookingLabel, cardBadges } from "./card-badges";

const now = new Date("2026-10-21T12:00:00Z");
const base = { didTask: false, audioOnly: false, appliedBefore: false, booking: null, media: { kind: "video", src: "", seconds: 1, bytes: 1, deletedAt: null }, stageId: MOCK_STAGES[0].id, createdAt: "2026-10-20T12:00:00Z" };
const mk = (over: Partial<ApplicantView>) => ({ ...base, ...over }) as ApplicantView;

describe("cardBadges", () => {
  it("lists flags in order", () => {
    const b = cardBadges(mk({ didTask: true, audioOnly: true, appliedBefore: true }), MOCK_STAGES, now);
    expect(b.map((x) => x.text)).toEqual(["Did task", "Audio only", "Applied before"]);
  });
  it("shows booked and cancelled bookings", () => {
    expect(cardBadges(mk({ booking: { start: "2026-10-22T10:00:00Z", end: "", status: "booked" } }), MOCK_STAGES, now, "UTC")[0].text).toBe("Booked Thu 10:00 AM");
    expect(cardBadges(mk({ booking: { start: "2026-10-22T10:00:00Z", end: "", status: "cancelled" } }), MOCK_STAGES, now)[0].text).toBe("Cancelled");
  });
  it("warns from day 25 and shows deleted videos", () => {
    const old = mk({ createdAt: "2026-09-24T12:00:00Z" });
    expect(cardBadges(old, MOCK_STAGES, now).at(-1)?.text).toBe("Deletes in 3 days");
    const gone = mk({ media: { kind: "video", src: "", seconds: 1, bytes: 1, deletedAt: "2026-10-01T00:00:00Z" } });
    expect(cardBadges(gone, MOCK_STAGES, now).at(-1)?.text).toBe("Video deleted");
  });
  it("formats the booking label", () => {
    expect(bookingLabel("2026-10-22T15:30:00Z", "UTC")).toBe("Thu 3:30 PM");
  });
});
