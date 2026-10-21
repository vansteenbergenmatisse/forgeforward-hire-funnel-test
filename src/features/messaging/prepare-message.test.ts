import { describe, expect, it } from "vitest";
import { prepareMessage, validateOutgoing } from "./prepare-message";

describe("prepareMessage", () => {
  it("fills body and subject and lists used variables", () => {
    const r = prepareMessage({ body: "Hi {first_name} {cal_link}", subject: "For {first_name}" }, { first_name: "Sam", cal_link: "u" });
    expect(r).toEqual({ ok: true, body: "Hi Sam u", subject: "For Sam", used: ["first_name", "cal_link"] });
  });
  it("names the missing variable", () => {
    const r = prepareMessage({ body: "Hi {first_name} {project_name}" }, { first_name: "Sam" });
    expect(r).toMatchObject({ ok: false, variable: "project_name" });
  });
});

describe("validateOutgoing", () => {
  it("rejects empty and unfilled", () => {
    expect(validateOutgoing("  ")).toBeTruthy();
    expect(validateOutgoing("Hi {last_name}")).toContain("last_name");
    expect(validateOutgoing("Hi Sam")).toBeNull();
  });
});
