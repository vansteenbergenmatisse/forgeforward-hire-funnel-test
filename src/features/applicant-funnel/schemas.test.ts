import { describe, expect, it } from "vitest";
import { startSchema, taskSchema } from "./schemas";

const valid = {
  projectSlug: "appointment-setter",
  firstName: "Sam",
  lastName: "Lee",
  email: "  Sam@Example.COM ",
  phone: "(415) 555-2671",
  phoneCountry: "US",
  whatsappOk: true,
  timezone: "America/New_York",
  consent: true as const,
};

describe("startSchema", () => {
  it("lowercases the email and returns E.164", () => {
    const r = startSchema.parse(valid);
    expect(r.email).toBe("sam@example.com");
    expect(r.phoneE164).toBe("+14155552671");
  });
  it("rejects a bad phone with the spec message", () => {
    const r = startSchema.safeParse({ ...valid, phone: "123" });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain("Check your phone number");
  });
  it("requires consent", () => {
    expect(startSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });
  it("rejects names over 60 characters", () => {
    expect(startSchema.safeParse({ ...valid, firstName: "a".repeat(61) }).success).toBe(false);
  });
});

describe("taskSchema", () => {
  it("needs at least one field unless skipped", () => {
    expect(taskSchema.safeParse({ resumeToken: "t" }).success).toBe(false);
    expect(taskSchema.safeParse({ resumeToken: "t", skip: true }).success).toBe(true);
    expect(taskSchema.safeParse({ resumeToken: "t", text: "hello" }).success).toBe(true);
  });
  it("caps the text at 5000 characters", () => {
    expect(taskSchema.safeParse({ resumeToken: "t", text: "a".repeat(5001) }).success).toBe(false);
  });
});

describe("startSchema bounds", () => {
  it("rejects an unknown time zone", () => {
    expect(startSchema.safeParse({ ...valid, timezone: "Mars/Olympus" }).success).toBe(false);
    expect(startSchema.safeParse({ ...valid, timezone: "UTC" }).success).toBe(true);
  });
  it("keeps only known tracking keys and caps their length", () => {
    const r = startSchema.parse({ ...valid, utm: { utm_source: "fb", evil: "x" } });
    expect(r.utm).toEqual({ utm_source: "fb" });
    expect(startSchema.safeParse({ ...valid, utm: { utm_source: "a".repeat(201) } }).success).toBe(false);
  });
  it("limits answer sizes and counts", () => {
    expect(startSchema.safeParse({ ...valid, answers: { q: "a".repeat(2001) } }).success).toBe(false);
    const many = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`q${i}`, "x"]));
    expect(startSchema.safeParse({ ...valid, answers: many }).success).toBe(false);
  });
  it("needs a two letter phone country", () => {
    expect(startSchema.safeParse({ ...valid, phoneCountry: "U1" }).success).toBe(false);
  });
});

describe("taskSchema link", () => {
  it("takes http and https links only", () => {
    expect(taskSchema.safeParse({ resumeToken: "t", link: "https://example.com/x" }).success).toBe(true);
    expect(taskSchema.safeParse({ resumeToken: "t", link: "javascript:alert(1)" }).success).toBe(false);
    expect(taskSchema.safeParse({ resumeToken: "t", link: "data:text/html,hi" }).success).toBe(false);
    expect(taskSchema.safeParse({ resumeToken: "t", link: `https://example.com/${"a".repeat(2100)}` }).success).toBe(false);
  });
});
