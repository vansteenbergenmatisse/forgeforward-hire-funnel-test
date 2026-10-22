import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendWhatsAppTemplate, sendWhatsAppText, whatsappConfigured } from "./cloud-api";
import { verifyHandshake, verifySignature } from "./verify";
import { parseWebhook } from "./webhook";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function keys() {
  vi.stubEnv("WA_PHONE_NUMBER_ID", "123");
  vi.stubEnv("WA_ACCESS_TOKEN", "tok");
}

describe("sends", () => {
  it("sends a template with ordered variables", async () => {
    keys();
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const r = await sendWhatsAppTemplate({ to: "+1 555 123", name: "interview_invite", language: "en", variables: ["Ana", "https://cal"] });
    expect(r).toEqual({ ok: true, providerMessageId: "wamid.1" });
    expect(f.mock.calls[0][0]).toContain("/123/messages");
    const body = JSON.parse(f.mock.calls[0][1].body);
    expect(body.to).toBe("1555123");
    expect(body.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual(["Ana", "https://cal"]);
  });
  it("sends free text", async () => {
    keys();
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "w2" }] }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    expect((await sendWhatsAppText({ to: "+1555", body: "Hi" })).ok).toBe(true);
    expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({ type: "text", text: { body: "Hi" } });
  });
  it("returns the provider error", async () => {
    keys();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Template not approved" } }), { status: 400 })));
    expect(await sendWhatsAppText({ to: "+1555", body: "Hi" })).toEqual({ ok: false, error: "Template not approved" });
  });
  it("does nothing without keys", async () => {
    vi.stubEnv("WA_ACCESS_TOKEN", "");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(whatsappConfigured()).toBe(false);
    expect((await sendWhatsAppText({ to: "+1555", body: "Hi" })).ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("verify", () => {
  const raw = '{"a":1}';
  const sig = "sha256=" + createHmac("sha256", "secret").update(raw).digest("hex");
  it("accepts a good signature", () => expect(verifySignature(raw, sig, "secret")).toBe(true));
  it("rejects a bad signature", () => {
    expect(verifySignature(raw, sig, "other")).toBe(false);
    expect(verifySignature(raw + " ", sig, "secret")).toBe(false);
    expect(verifySignature(raw, "sha256=abcd", "secret")).toBe(false);
    expect(verifySignature(raw, null, "secret")).toBe(false);
    expect(verifySignature(raw, sig, undefined)).toBe(false);
  });
  it("answers the handshake", () => {
    const p = (t: string) => new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": t, "hub.challenge": "42" });
    expect(verifyHandshake(p("tok"), "tok")).toBe("42");
    expect(verifyHandshake(p("bad"), "tok")).toBeNull();
    expect(verifyHandshake(p("tok"), undefined)).toBeNull();
  });
});

describe("parseWebhook", () => {
  it("reads statuses and inbound text", () => {
    const body = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ id: "w1", status: "delivered" }, { id: "w2", status: "failed", errors: [{ message: "Undeliverable" }] }],
                messages: [{ id: "w3", from: "1555", timestamp: "1700000000", type: "text", text: { body: "Yes" } }],
              },
            },
          ],
        },
      ],
    };
    const ev = parseWebhook(body);
    expect(ev).toHaveLength(3);
    expect(ev[1]).toMatchObject({ type: "status", status: "failed", error: "Undeliverable" });
    expect(ev[2]).toMatchObject({ type: "inbound", from: "1555", text: "Yes" });
  });
  it("ignores junk", () => expect(parseWebhook("nope")).toEqual([]));
});
