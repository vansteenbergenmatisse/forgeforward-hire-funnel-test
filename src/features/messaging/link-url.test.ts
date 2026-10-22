import { describe, expect, it } from "vitest";
import { buildLinkUrl, InvalidContactError } from "./link-url";

const base = { phoneE164: "+27825550143", email: "a@b.co", subject: "Hi there", body: "Book: https://x.io/?a=1&b=2" };

describe("buildLinkUrl", () => {
  it("builds a wa.me link with digits only", () => {
    expect(buildLinkUrl({ ...base, channel: "whatsapp" })).toBe(`https://wa.me/27825550143?text=${encodeURIComponent(base.body)}`);
  });
  it("builds an sms link", () => {
    expect(buildLinkUrl({ ...base, channel: "sms" })).toBe(`sms:+27825550143?&body=${encodeURIComponent(base.body)}`);
  });
  it("builds a mailto link with subject", () => {
    const u = buildLinkUrl({ ...base, channel: "email" });
    expect(u.startsWith("mailto:a%40b.co?subject=Hi%20there&body=")).toBe(true);
    expect(u).toContain(encodeURIComponent("&b=2"));
  });
  it("refuses a phone number that is not strict E.164", () => {
    for (const phoneE164 of ["+1;rm", "0825550143", "+12", "sms:+1"]) {
      expect(() => buildLinkUrl({ ...base, phoneE164, channel: "sms" })).toThrow(InvalidContactError);
      expect(() => buildLinkUrl({ ...base, phoneE164, channel: "whatsapp" })).toThrow(InvalidContactError);
    }
    expect(buildLinkUrl({ ...base, phoneE164: "nonsense", channel: "email" })).toContain("mailto:");
  });
});
