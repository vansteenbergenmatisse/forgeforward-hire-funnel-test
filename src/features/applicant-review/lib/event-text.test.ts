import { describe, expect, it } from "vitest";
import { eventText, newestFirst } from "./event-text";
import { formatDuration } from "./format";
import { answerText, safeHref } from "./answer-text";

const name = (id: string | null) => ({ a: "New", b: "Did task" })[id ?? ""] ?? "Unknown";
const ev = (type: string, data?: Record<string, unknown>, at = "2026-10-19T10:00:00Z") => ({ id: type + at, type, at, data });

describe("eventText", () => {
  it("names both stages", () => {
    expect(eventText(ev("stage_changed", { from: "a", to: "b" }), name)).toBe("Stage changed: New to Did task");
  });
  it("handles the first placement", () => {
    expect(eventText(ev("stage_changed", { from: null, to: "a" }), name)).toBe("Added to New");
  });
  it("formats video length and channel", () => {
    expect(eventText(ev("video_saved", { seconds: 57 }), name)).toBe("Video saved (0:57)");
    expect(eventText(ev("message_sent", { channel: "whatsapp" }), name)).toBe("WhatsApp message sent");
    expect(eventText(ev("message_received", { channel: "sms" }), name)).toBe("SMS reply received");
  });
  it("falls back for unknown types", () => {
    expect(eventText(ev("something_new"), name)).toBe("Something new");
  });
});

describe("helpers", () => {
  it("sorts newest first without mutating", () => {
    const list = [ev("a", undefined, "2026-10-19T10:00:00Z"), ev("b", undefined, "2026-10-20T10:00:00Z")];
    expect(newestFirst(list).map((e) => e.type)).toEqual(["b", "a"]);
    expect(list[0].type).toBe("a");
  });
  it("formats duration", () => {
    expect(formatDuration(125)).toBe("2:05");
    expect(formatDuration(NaN)).toBe("0:00");
  });
  it("formats answers and filters unsafe links", () => {
    expect(answerText({ label: "x", type: "yes_no", value: true })).toBe("Yes");
    expect(answerText({ label: "x", type: "multi_choice", value: ["a", "b"] })).toBe("a, b");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("https://x.io")).toBe("https://x.io/");
  });
});
