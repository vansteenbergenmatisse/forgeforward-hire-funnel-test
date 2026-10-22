import { describe, expect, it } from "vitest";
import { DEFAULT_THANK_YOU } from "@/features/projects";
import { fillThankYou, splitThankYou } from "./thank-you";

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

describe("fillThankYou with special characters", () => {
  it("keeps $ patterns in a name as plain text", () => {
    expect(fillThankYou("Thanks {first_name}.", { firstName: "Jo$&", replyDays: 5 })).toBe("Thanks Jo$&.");
    expect(fillThankYou("A {first_name} B", { firstName: "A$'B", replyDays: 5 })).toBe("A A$'B B");
  });
});

describe("splitThankYou", () => {
  it("uses the first sentence as the heading", () => {
    expect(splitThankYou("Thanks, {first_name}. We reply in {reply_days} days. Talk soon.", { firstName: "Sam", replyDays: 5 })).toEqual({
      heading: "Thanks, Sam",
      body: "We reply in 5 days. Talk soon.",
    });
  });
  it("is not moved by a full stop inside the name", () => {
    expect(splitThankYou("Thanks, {first_name}. Done.", { firstName: "J. R.", replyDays: 5 }).body).toBe("Done.");
  });
  it("handles one sentence", () => {
    expect(splitThankYou("All done!", { firstName: "S", replyDays: 1 })).toEqual({ heading: "All done!", body: "" });
  });
});
