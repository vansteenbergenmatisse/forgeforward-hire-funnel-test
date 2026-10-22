import { afterEach, describe, expect, it, vi } from "vitest";
import { ghlConfigured, sendGhlSms } from "./client";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const input = { phoneE164: "+15551234567", firstName: "Ana", lastName: "Lee", body: "Hi" };
const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 });

describe("sendGhlSms", () => {
  it("upserts the contact then sends the SMS", async () => {
    vi.stubEnv("GHL_PRIVATE_TOKEN", "tok");
    vi.stubEnv("GHL_LOCATION_ID", "loc");
    const f = vi.fn().mockResolvedValueOnce(ok({ contact: { id: "c1" } })).mockResolvedValueOnce(ok({ messageId: "m1" }));
    vi.stubGlobal("fetch", f);
    expect(await sendGhlSms(input)).toEqual({ ok: true, providerMessageId: "m1" });
    expect(f.mock.calls[0][0]).toBe("https://services.leadconnectorhq.com/contacts/upsert");
    expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({ locationId: "loc", phone: "+15551234567" });
    expect(f.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
    expect(f.mock.calls[1][0]).toBe("https://services.leadconnectorhq.com/conversations/messages");
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({ type: "SMS", contactId: "c1", message: "Hi" });
  });
  it("stops at a contact error", async () => {
    vi.stubEnv("GHL_PRIVATE_TOKEN", "tok");
    vi.stubEnv("GHL_LOCATION_ID", "loc");
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }));
    vi.stubGlobal("fetch", f);
    expect(await sendGhlSms(input)).toEqual({ ok: false, error: "Unauthorized" });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("reports a send error", async () => {
    vi.stubEnv("GHL_PRIVATE_TOKEN", "tok");
    vi.stubEnv("GHL_LOCATION_ID", "loc");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(ok({ contact: { id: "c1" } })).mockResolvedValueOnce(new Response("{}", { status: 422 })));
    expect((await sendGhlSms(input)).ok).toBe(false);
  });
  it("needs both keys", async () => {
    vi.stubEnv("GHL_PRIVATE_TOKEN", "tok");
    vi.stubEnv("GHL_LOCATION_ID", "");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(ghlConfigured()).toBe(false);
    expect((await sendGhlSms(input)).ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
