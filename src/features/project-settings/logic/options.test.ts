import { describe, expect, it } from "vitest";
import { normalizeOptions, validateOptions } from "./options";

describe("normalizeOptions", () => {
  it("trims, collapses spaces, drops blanks and duplicates", () => {
    expect(normalizeOptions([" Yes ", "", "yes", "No  way", "no way"])).toEqual(["Yes", "No way"]);
  });
});

describe("validateOptions", () => {
  it("needs two choices for choice types", () => {
    expect(validateOptions("single_choice", ["A", "a", " "])).not.toBeNull();
    expect(validateOptions("multi_choice", ["A", "B"])).toBeNull();
  });
  it("ignores other types", () => expect(validateOptions("short_text", [])).toBeNull());
});
