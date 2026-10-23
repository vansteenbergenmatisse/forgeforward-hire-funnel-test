import { describe, expect, it } from "vitest";
import type { tables } from "@/platform/db";
import { buildAnswers } from "./answers";

type Q = typeof tables.projectQuestions.$inferSelect;
const q = (over: Partial<Q>): Q => ({ id: "q1", projectId: "p", label: "Pick", helpText: "", type: "single_choice", options: ["A", "B", "C"], required: true, position: 0, archived: false, createdAt: new Date(), updatedAt: new Date(), ...over });

describe("buildAnswers", () => {
  it("stores Choose one as one string", () => {
    expect(buildAnswers([q({})], { q1: "B" })).toEqual({ q1: { label: "Pick", type: "single_choice", value: "B" } });
  });
  it("refuses a list or an unknown option for Choose one", () => {
    expect(() => buildAnswers([q({})], { q1: ["A"] })).toThrow();
    expect(() => buildAnswers([q({})], { q1: "Z" })).toThrow();
  });
  it("stores Choose several as a list and refuses a lone string", () => {
    const multi = q({ type: "multi_choice" });
    expect(buildAnswers([multi], { q1: ["A", "C"] }).q1.value).toEqual(["A", "C"]);
    expect(() => buildAnswers([multi], { q1: "A" })).toThrow();
  });
  it("needs an answer when required, accepts none when optional", () => {
    expect(() => buildAnswers([q({})], {})).toThrow();
    expect(buildAnswers([q({ required: false })], {})).toEqual({});
  });
});
