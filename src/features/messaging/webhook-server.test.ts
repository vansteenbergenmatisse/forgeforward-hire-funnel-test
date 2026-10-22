import { describe, expect, it } from "vitest";
import { handleWhatsAppEvents, shouldAdvance, type WebhookStore } from "./webhook-server";

describe("shouldAdvance", () => {
  it("only moves forward", () => {
    expect(shouldAdvance("sent", "delivered")).toBe(true);
    expect(shouldAdvance("read", "delivered")).toBe(false);
    expect(shouldAdvance("delivered", "failed")).toBe(true);
    expect(shouldAdvance(null, "read")).toBe(false);
  });
});

describe("handleWhatsAppEvents", () => {
  it("updates statuses and records inbound replies once", async () => {
    const updates: string[] = [];
    const seen = new Set<string>();
    const store: WebhookStore = {
      currentStatus: async (id) => (id === "w1" ? "sent" : null),
      updateStatus: async (id, s) => void updates.push(`${id}:${s}`),
      recordInbound: async (e) => !seen.has(e.messageId) && !!seen.add(e.messageId),
    };
    const body = { entry: [{ changes: [{ value: { statuses: [{ id: "w1", status: "read" }, { id: "zz", status: "read" }], messages: [{ id: "in1", from: "1555", text: { body: "ok" } }] } }] }] };
    expect(await handleWhatsAppEvents(store, body)).toEqual({ statuses: 1, inbound: 1 });
    expect(updates).toEqual(["w1:read"]);
    expect(await handleWhatsAppEvents(store, body)).toEqual({ statuses: 1, inbound: 0 });
  });
});
