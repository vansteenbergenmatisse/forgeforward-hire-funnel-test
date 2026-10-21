import { describe, expect, it } from "vitest";
import { parsePhone } from "./phone";

describe("parsePhone", () => {
  it("stores E.164 for a valid US number", () => {
    expect(parsePhone("(415) 555-2671", "US")).toEqual({ e164: "+14155552671", country: "US" });
  });
  it("accepts an international number without a default country", () => {
    expect(parsePhone("+27 82 123 4567")?.e164).toBe("+27821234567");
  });
  it("rejects an invalid number", () => {
    expect(parsePhone("12345", "US")).toBeNull();
  });
});
