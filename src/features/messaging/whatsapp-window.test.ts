import { describe, expect, it } from "vitest";
import { whatsappWindow, whatsappWindowText } from "./whatsapp-window";

const now = new Date("2026-10-21T06:00:00Z");
const m = (direction: "in" | "out", at: string, channel = "whatsapp") => ({ channel, direction, at });

describe("whatsappWindow", () => {
  it("is closed with no inbound message", () => {
    expect(whatsappWindow([m("out", "2026-10-21T01:00:00Z")], now)).toEqual({ open: false });
  });
  it("counts hours left from the last inbound message", () => {
    const w = whatsappWindow([m("in", "2026-10-20T07:00:00Z"), m("in", "2026-10-20T09:30:00Z")], now);
    expect(w).toMatchObject({ open: true, hoursLeft: 4 });
  });
  it("closes after 24 hours", () => {
    expect(whatsappWindow([m("in", "2026-10-20T05:00:00Z")], now).open).toBe(false);
  });
  it("ignores other channels", () => {
    expect(whatsappWindow([m("in", "2026-10-21T05:00:00Z", "sms")], now).open).toBe(false);
  });
  it("words the result", () => {
    expect(whatsappWindowText({ open: true, hoursLeft: 21, lastReplyAt: "" })).toBe("Free text is open for 21 more hours. After that only approved templates send.");
    expect(whatsappWindowText({ open: false })).toContain("closed");
  });
});
