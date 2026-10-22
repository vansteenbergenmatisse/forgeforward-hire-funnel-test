import { afterEach, describe, expect, it, vi } from "vitest";
import type { TemplateDef } from "@/features/projects";
import { sendApplicantMessage, type OutgoingRow, type SendApplicant, type SendStore } from "./send-server";

const A: SendApplicant = { id: "a1", firstName: "Ana", lastName: "Lee", email: "ana@x.co", phoneE164: "+15551234567", projectName: "Setter", calLink: "https://cal.com/f/i" };
const T: TemplateDef = { id: "t1", channel: "email", name: "Invite", subject: "Hi {first_name}", body: "Book: {cal_link}" };
const WA: TemplateDef = { id: "t2", channel: "whatsapp", name: "Invite", subject: "", body: "Hi {first_name} {cal_link}", waTemplateName: "interview_invite", waLanguage: "en", waVariables: ["first_name", "cal_link"] };

function store(over: Partial<SendStore> & { applicant?: SendApplicant | null; templates?: TemplateDef[] } = {}) {
  const rows: OutgoingRow[] = [];
  const s: SendStore = {
    loadApplicant: async () => (over.applicant === undefined ? A : over.applicant),
    loadTemplate: async (id) => (over.templates ?? [T, WA]).find((t) => t.id === id) ?? null,
    lastWhatsAppReplyAt: async () => null,
    insertMessage: async (r) => void rows.push(r),
    ...over,
  };
  return { s, rows };
}

const base = { applicantId: "a1" };
const emailKeys = () => {
  vi.stubEnv("RESEND_API_KEY", "k");
  vi.stubEnv("EMAIL_FROM", "f@x.co");
};
const waKeys = () => {
  vi.stubEnv("WA_PHONE_NUMBER_ID", "1");
  vi.stubEnv("WA_ACCESS_TOKEN", "t");
};
const okJson = (j: unknown, status = 200) => new Response(JSON.stringify(j), { status });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendApplicantMessage", () => {
  it("sends email through Resend and saves a sent row", async () => {
    emailKeys();
    const f = vi.fn().mockResolvedValue(okJson({ id: "em1" }));
    vi.stubGlobal("fetch", f);
    const { s, rows } = store();
    const r = await sendApplicantMessage(s, { ...base, channel: "email", templateId: "t1" });
    expect(r).toMatchObject({ ok: true, mode: "api" });
    const sent = JSON.parse(f.mock.calls[0][1].body);
    expect(sent.subject).toBe("Hi Ana");
    expect(sent.text).toContain("https://cal.com/f/i?name=Ana%20Lee");
    expect(rows[0]).toMatchObject({ status: "sent", mode: "api", providerMessageId: "em1", templateId: "t1" });
  });

  it("saves a failed row on provider error", async () => {
    emailKeys();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okJson({ message: "Bad" }, 422)));
    const { s, rows } = store();
    const r = await sendApplicantMessage(s, { ...base, channel: "email", templateId: "t1" });
    expect(r).toMatchObject({ ok: false, code: "provider", error: "Bad" });
    expect(rows[0]).toMatchObject({ status: "failed", error: "Bad" });
  });

  it("falls back to link mode when keys are missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const { s, rows } = store();
    const r = await sendApplicantMessage(s, { ...base, channel: "email", templateId: "t1" });
    expect(r).toMatchObject({ ok: true, mode: "link" });
    expect((r as { url: string }).url.startsWith("mailto:")).toBe(true);
    expect(rows[0]).toMatchObject({ mode: "link", status: "opened_link" });
    expect(f).not.toHaveBeenCalled();
  });

  it("mode link only saves the row, even when keys are set", async () => {
    emailKeys();
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const { s, rows } = store();
    const r = await sendApplicantMessage(s, { ...base, channel: "email", templateId: "t1", mode: "link" });
    expect(r).toMatchObject({ ok: true, mode: "link" });
    expect(rows[0]).toMatchObject({ mode: "link", status: "opened_link" });
    expect(f).not.toHaveBeenCalled();
  });

  it("blocks and names a missing template variable", async () => {
    emailKeys();
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const { s, rows } = store({ applicant: { ...A, calLink: "" } });
    const r = await sendApplicantMessage(s, { ...base, channel: "email", templateId: "t1" });
    expect(r).toMatchObject({ ok: false, code: "missing_variable", variable: "cal_link" });
    expect(rows).toHaveLength(0);
    expect(f).not.toHaveBeenCalled();
  });

  it("blocks leftover tokens in an edited body", async () => {
    const { s } = store();
    const r = await sendApplicantMessage(s, { ...base, channel: "sms", body: "Hi {first_name}" });
    expect(r).toMatchObject({ ok: false, code: "invalid" });
  });

  it("returns not_found for an unknown applicant", async () => {
    const { s } = store({ applicant: null });
    expect(await sendApplicantMessage(s, { ...base, channel: "sms", body: "Hi" })).toMatchObject({ ok: false, code: "not_found" });
  });

  it("sends WhatsApp template when the window is closed", async () => {
    waKeys();
    const f = vi.fn().mockResolvedValue(okJson({ messages: [{ id: "w1" }] }));
    vi.stubGlobal("fetch", f);
    const { s, rows } = store();
    const r = await sendApplicantMessage(s, { ...base, channel: "whatsapp", templateId: "t2" });
    expect(r.ok).toBe(true);
    const body = JSON.parse(f.mock.calls[0][1].body);
    expect(body.type).toBe("template");
    expect(body.template.components[0].parameters[0].text).toBe("Ana");
    expect(rows[0]).toMatchObject({ providerMessageId: "w1" });
  });

  it("sends free text inside the 24h window and refuses outside without a template", async () => {
    waKeys();
    const f = vi.fn().mockResolvedValue(okJson({ messages: [{ id: "w1" }] }));
    vi.stubGlobal("fetch", f);
    const now = new Date("2026-01-02T12:00:00Z");
    const open = store({ lastWhatsAppReplyAt: async () => new Date("2026-01-02T00:00:00Z") });
    expect((await sendApplicantMessage(open.s, { ...base, channel: "whatsapp", body: "Hello" }, now)).ok).toBe(true);
    expect(JSON.parse(f.mock.calls[0][1].body).type).toBe("text");
    const closed = store({ lastWhatsAppReplyAt: async () => new Date("2026-01-01T00:00:00Z") });
    expect(await sendApplicantMessage(closed.s, { ...base, channel: "whatsapp", body: "Hello" }, now)).toMatchObject({ ok: false, code: "window_closed" });
  });

  it("sends SMS through GoHighLevel", async () => {
    vi.stubEnv("GHL_PRIVATE_TOKEN", "t");
    vi.stubEnv("GHL_LOCATION_ID", "l");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(okJson({ contact: { id: "c" } })).mockResolvedValueOnce(okJson({ messageId: "m" })));
    const { s, rows } = store();
    expect((await sendApplicantMessage(s, { ...base, channel: "sms", body: "Hi" })).ok).toBe(true);
    expect(rows[0]).toMatchObject({ providerMessageId: "m", channel: "sms" });
  });

  describe("send test to me", () => {
    it("sends to TEST_EMAIL and saves nothing", async () => {
      emailKeys();
      vi.stubEnv("TEST_EMAIL", "me@x.co");
      const f = vi.fn().mockResolvedValue(okJson({ id: "em" }));
      vi.stubGlobal("fetch", f);
      const { s, rows } = store();
      const r = await sendApplicantMessage(s, { ...base, channel: "email", templateId: "t1", test: true });
      expect(r).toMatchObject({ ok: true, test: true });
      expect(JSON.parse(f.mock.calls[0][1].body).to).toEqual(["me@x.co"]);
      expect(rows).toHaveLength(0);
    });
    it("needs keys and a target", async () => {
      vi.stubEnv("RESEND_API_KEY", "");
      const { s } = store();
      expect(await sendApplicantMessage(s, { ...base, channel: "email", templateId: "t1", test: true })).toMatchObject({ ok: false, code: "not_configured" });
      emailKeys();
      vi.stubEnv("TEST_EMAIL", "");
      expect(await sendApplicantMessage(s, { ...base, channel: "email", templateId: "t1", test: true })).toMatchObject({ ok: false, code: "not_configured" });
    });
  });
});
