import { describe, expect, it } from "vitest";
import { buildCalLink } from "./cal-link";

describe("buildCalLink", () => {
  it("encodes every value", () => {
    const url = buildCalLink({
      calLink: "https://cal.com/forge/interview",
      firstName: "Sam",
      lastName: "O'Neil",
      email: "sam+x@example.com",
      applicantId: "abc-123",
    });
    expect(url).toBe(
      "https://cal.com/forge/interview?name=Sam%20O'Neil&email=sam%2Bx%40example.com&metadata[applicant_id]=abc-123",
    );
  });
  it("appends with & when the link already has a query", () => {
    const url = buildCalLink({ calLink: "https://cal.com/a?x=1", firstName: "A", lastName: "B", email: "a@b.co", applicantId: "1" });
    expect(url.startsWith("https://cal.com/a?x=1&name=")).toBe(true);
  });
});
