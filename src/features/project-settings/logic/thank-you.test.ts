import { describe, expect, it } from "vitest";
import { DEFAULT_THANK_YOU } from "@/features/projects";
import { renderThankYou, splitThankYou, validateThankYou } from "./thank-you";

describe("thank-you text", () => {
  it("accepts the default", () => expect(validateThankYou(DEFAULT_THANK_YOU)).toBeNull());
  it("rejects empty and unknown variables", () => {
    expect(validateThankYou("  ")).not.toBeNull();
    expect(validateThankYou("Hi {cal_link}")).toMatch(/cal_link/);
  });
  it("fills both variables everywhere", () => {
    expect(renderThankYou("{first_name} {first_name} {reply_days}", "Sam", 5)).toBe("Sam Sam 5");
    expect(renderThankYou("Hi {first_name}.", "$&$1", 5)).toBe("Hi $&$1.");
  });
  it("splits heading and body", () => {
    const r = splitThankYou(renderThankYou(DEFAULT_THANK_YOU, "Sam", 5));
    expect(r.heading).toBe("Thanks, Sam");
    expect(r.body.startsWith("We got your application.")).toBe(true);
    expect(splitThankYou("One line")).toEqual({ heading: "One line", body: "" });
  });
});
