import { describe, expect, it } from "vitest";
import { checkWebhookAuth, signCalcomBody, verifyCalcomSignature } from "./signature";
import { parseCalcomWebhook } from "./parse";
import { WEBHOOK_MAX_AGE_MS, isReplay } from "./server";

const body = JSON.stringify({ triggerEvent: "BOOKING_CREATED" });

describe("signature", () => {
  it("accepts a valid hex HMAC-SHA256 of the raw body", () => {
    const sig = signCalcomBody(body, "s3cret");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyCalcomSignature(body, sig, "s3cret")).toBe(true);
  });
  it("rejects wrong secret, changed body, missing or short header", () => {
    const sig = signCalcomBody(body, "s3cret");
    expect(verifyCalcomSignature(body, sig, "other")).toBe(false);
    expect(verifyCalcomSignature(body + " ", sig, "s3cret")).toBe(false);
    expect(verifyCalcomSignature(body, null, "s3cret")).toBe(false);
    expect(verifyCalcomSignature(body, "abc", "s3cret")).toBe(false);
  });
  it("without a secret: rejects in every environment", () => {
    expect(checkWebhookAuth(body, null, undefined, "production")).toMatchObject({ ok: false, status: 503 });
    expect(checkWebhookAuth(body, null, undefined, "development")).toMatchObject({ ok: false, status: 503 });
    expect(checkWebhookAuth(body, null, undefined, "test")).toMatchObject({ ok: false, status: 503 });
  });
  it("with a secret: unsigned is 401", () => {
    expect(checkWebhookAuth(body, null, "s", "production")).toMatchObject({ ok: false, status: 401 });
  });
});

describe("parseCalcomWebhook", () => {
  const base = {
    triggerEvent: "BOOKING_CREATED",
    payload: {
      uid: "abc",
      title: "Interview",
      startTime: "2026-10-22T14:00:00Z",
      endTime: "2026-10-22T14:30:00Z",
      attendees: [{ email: "Jane@Example.com", name: "Jane" }],
      metadata: { applicant_id: "11111111-1111-4111-8111-111111111111" },
    },
  };
  it("normalizes a booking", () => {
    const r = parseCalcomWebhook(base);
    expect(r.kind).toBe("booking");
    if (r.kind === "booking") {
      expect(r.event.attendeeEmail).toBe("jane@example.com");
      expect(r.event.applicantId).toBe("11111111-1111-4111-8111-111111111111");
      expect(r.event.start).toBe("2026-10-22T14:00:00.000Z");
    }
  });
  it("ignores other triggers and rejects junk", () => {
    expect(parseCalcomWebhook({ triggerEvent: "PING" })).toEqual({ kind: "ignored", trigger: "PING" });
    expect(parseCalcomWebhook({ triggerEvent: "BOOKING_CREATED", payload: {} })).toEqual({ kind: "invalid" });
    expect(parseCalcomWebhook(null)).toEqual({ kind: "invalid" });
  });
});

describe("isReplay", () => {
  const now = new Date("2026-10-22T12:00:00Z");
  it("accepts a fresh payload and one without a time", () => {
    expect(isReplay(new Date(now.getTime() - 60_000), now)).toBe(false);
    expect(isReplay(null, now)).toBe(false);
  });
  it("rejects an old payload and one from the far future", () => {
    expect(isReplay(new Date(now.getTime() - WEBHOOK_MAX_AGE_MS - 1000), now)).toBe(true);
    expect(isReplay(new Date(now.getTime() + 3_600_000), now)).toBe(true);
  });
  it("reads the sent time from the payload", () => {
    const r = parseCalcomWebhook({
      triggerEvent: "BOOKING_CREATED",
      createdAt: "2026-10-22T11:59:00.000Z",
      payload: { uid: "u", startTime: "2026-10-22T14:00:00Z", endTime: "2026-10-22T14:30:00Z" },
    });
    expect(r.kind === "booking" && r.sentAt?.toISOString()).toBe("2026-10-22T11:59:00.000Z");
  });
});
