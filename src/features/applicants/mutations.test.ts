import { describe, expect, it } from "vitest";
import { buildMockApplicants } from "./mock";
import { applyMessage, applyMove, applyPlace } from "./mutations";

const base = buildMockApplicants().find((a) => a.firstName === "Maria")!;
const now = new Date("2026-10-22T10:00:00Z");

describe("mutations", () => {
  it("moves a card and writes a stage_changed event", () => {
    const moved = applyMove(base, "st-booked", now);
    expect(moved.stageId).toBe("st-booked");
    expect(moved.lastStageChangeAt).toBe(now.toISOString());
    const last = moved.events[moved.events.length - 1];
    expect(last.type).toBe("stage_changed");
    expect(last.data).toEqual({ from: "st-new", to: "st-booked" });
    expect(base.stageId).toBe("st-new");
  });
  it("ignores a move to the same stage", () => {
    expect(applyMove(base, "st-new", now)).toBe(base);
  });
  it("places a did-not-finish card without touching funnelStep", () => {
    const dnf = buildMockApplicants().find((a) => a.stageId === null)!;
    const placed = applyPlace(dnf, "st-new", now);
    expect(placed.stageId).toBe("st-new");
    expect(placed.funnelStep).toBe(dnf.funnelStep);
    expect(placed.events.at(-1)?.data).toEqual({ from: null, to: "st-new" });
  });
  it("appends messages with timeline events", () => {
    const out = applyMessage(base, { channel: "email", direction: "out", mode: "link", body: "Hi", status: "sent" }, now);
    expect(out.messages).toHaveLength(1);
    expect(out.events.at(-1)?.type).toBe("message_sent");
    const inbound = applyMessage(out, { channel: "whatsapp", direction: "in", mode: "api", body: "Hello", status: "received" }, now);
    expect(inbound.unreadReply).toBe(true);
    expect(inbound.events.at(-1)?.type).toBe("message_received");
  });
});
