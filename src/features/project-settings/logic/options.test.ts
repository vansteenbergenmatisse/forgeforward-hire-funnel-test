import { describe, expect, it } from "vitest";
import { OPTIONS_MAX, normalizeOptions, validateOptions } from "./options";

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

describe("validateOptions for Choose one and Choose several", () => {
  it.each(["single_choice", "multi_choice"])("%s needs two different, filled choices", (type) => {
    expect(validateOptions(type, ["A", "B", "C"])).toBeNull();
    expect(validateOptions(type, ["A"])).toBe("Add at least two different choices.");
    expect(validateOptions(type, ["A", ""])).toBe("Fill in or remove the empty choice.");
    expect(validateOptions(type, ["A", " a "])).toBe("Each choice must be different.");
  });
  it("caps the number and the length of choices", () => {
    expect(validateOptions("single_choice", Array.from({ length: OPTIONS_MAX }, (_, i) => `c${i}`))).toBeNull();
    expect(validateOptions("single_choice", Array.from({ length: OPTIONS_MAX + 1 }, (_, i) => `c${i}`))).toMatch(/30 choices or fewer/);
    expect(validateOptions("single_choice", ["A", "x".repeat(121)])).toMatch(/under 120/);
  });
});
