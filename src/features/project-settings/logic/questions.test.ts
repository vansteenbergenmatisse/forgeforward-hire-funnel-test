import { describe, expect, it } from "vitest";
import { MOCK_QUESTIONS } from "@/features/projects";
import { QUESTION_TYPES, blankQuestion, normalizeQuestion, setArchived, typeLabel, validateQuestion } from "./questions";

describe("validateQuestion", () => {
  it("accepts the mock question", () => expect(validateQuestion(MOCK_QUESTIONS[0])).toEqual({}));
  it("needs a label", () => expect(validateQuestion({ label: " ", type: "short_text", options: [] }).label).toBeDefined());
  it("needs two choices for choice types", () => expect(validateQuestion({ label: "x", type: "single_choice", options: ["a"] }).options).toBeDefined());
});

describe("normalizeQuestion", () => {
  it("drops options when the type has none", () => {
    expect(normalizeQuestion({ ...blankQuestion("q"), label: " Hi ", options: ["a", "b"] })).toMatchObject({ label: "Hi", options: [] });
  });
  it("normalizes choices", () => {
    expect(normalizeQuestion({ ...blankQuestion("q"), type: "multi_choice", options: [" A ", "a", "B", ""] }).options).toEqual(["A", "B"]);
  });
});

describe("setArchived", () => {
  it("archives and restores without deleting", () => {
    const archived = setArchived(MOCK_QUESTIONS, MOCK_QUESTIONS[0].id, true);
    expect(archived).toHaveLength(MOCK_QUESTIONS.length);
    expect(archived[0].archived).toBe(true);
    expect(setArchived(archived, MOCK_QUESTIONS[0].id, false)[0].archived).toBe(false);
  });
});

describe("question types", () => {
  it("offers Choose one and Choose several next to the other types", () => {
    expect(QUESTION_TYPES.map((t) => t.id)).toEqual(["short_text", "long_text", "number", "single_choice", "multi_choice", "yes_no"]);
    expect(typeLabel("single_choice")).toBe("Choose one");
    expect(typeLabel("multi_choice")).toBe("Choose several");
  });
  it("keeps the choices when a question switches between Choose one and Choose several", () => {
    const one = { ...blankQuestion("q"), label: "Pick", type: "single_choice" as const, options: ["A", "B", "C"] };
    expect(normalizeQuestion({ ...one, type: "multi_choice" }).options).toEqual(["A", "B", "C"]);
    expect(normalizeQuestion({ ...one, type: "multi_choice" }).type).toBe("multi_choice");
  });
});
