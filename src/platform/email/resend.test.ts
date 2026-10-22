import { afterEach, describe, expect, it, vi } from "vitest";
import { emailConfigured, sendEmail } from "./resend";
import { renderEmailHtml } from "./html";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function keys() {
  vi.stubEnv("RESEND_API_KEY", "k");
  vi.stubEnv("EMAIL_FROM", "Forge <hire@example.com>");
  vi.stubEnv("EMAIL_REPLY_TO", "reply@example.com");
}

describe("sendEmail", () => {
  it("sends text and html with reply-to", async () => {
    keys();
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "em1" }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const r = await sendEmail({ to: "a@b.co", subject: "Hi", text: "Hello\n\nhttps://x.co" });
    expect(r).toEqual({ ok: true, providerMessageId: "em1" });
    const body = JSON.parse(f.mock.calls[0][1].body);
    expect(body).toMatchObject({ from: "Forge <hire@example.com>", to: ["a@b.co"], reply_to: "reply@example.com", text: "Hello\n\nhttps://x.co" });
    expect(body.html).toContain('href="https://x.co"');
  });
  it("returns the provider error", async () => {
    keys();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Domain not verified" }), { status: 403 })));
    expect(await sendEmail({ to: "a@b.co", subject: "s", text: "t" })).toEqual({ ok: false, error: "Domain not verified" });
  });
  it("fails without calling out when keys are missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(emailConfigured()).toBe(false);
    expect((await sendEmail({ to: "a@b.co", subject: "s", text: "t" })).ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
  it("escapes html", () => {
    expect(renderEmailHtml("<script>x</script>")).not.toContain("<script>");
  });
});
