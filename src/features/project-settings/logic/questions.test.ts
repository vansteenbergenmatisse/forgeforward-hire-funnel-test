import { describe, expect, it } from "vitest";
import { MOCK_QUESTIONS } from "@/features/projects";
import { blankQuestion, normalizeQuestion, setArchived, validateQuestion } from "./questions";

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
