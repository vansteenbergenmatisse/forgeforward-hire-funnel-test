import { describe, expect, it } from "vitest";
import { DEFAULT_THANK_YOU } from "@/features/projects";
import { fillThankYou } from "./thank-you";

describe("fillThankYou", () => {
  it("replaces both variables everywhere", () => {
    expect(fillThankYou("Hi {first_name}, {first_name}! {reply_days} days.", { firstName: " Sam ", replyDays: 5 })).toBe(
      "Hi Sam, Sam! 5 days.",
    );
  });
  it("works with the default text", () => {
    const out = fillThankYou(DEFAULT_THANK_YOU, { firstName: "Sam", replyDays: 5 });
    expect(out).not.toMatch(/[{}]/);
    expect(out).toContain("Sam");
  });
});
