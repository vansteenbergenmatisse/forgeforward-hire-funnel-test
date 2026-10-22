import { describe, expect, it, vi } from "vitest";
import { sendViaApi } from "./send-client";

const input = { applicantId: "a", channel: "sms" as const, body: "Hi" };

describe("sendViaApi", () => {
  it("returns ok with mode and url", async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, mode: "link", url: "sms:+1" }), { status: 200 }));
    expect(await sendViaApi(input, f as unknown as typeof fetch)).toEqual({ ok: true, mode: "link", url: "sms:+1" });
  });
  it("returns the server error", async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: "Missing value for {cal_link}." }), { status: 422 }));
    expect(await sendViaApi(input, f as unknown as typeof fetch)).toEqual({ ok: false, error: "Missing value for {cal_link}." });
  });
  it("handles a network failure", async () => {
    const f = vi.fn().mockRejectedValue(new Error("x"));
    expect((await sendViaApi(input, f as unknown as typeof fetch)).ok).toBe(false);
  });
});
