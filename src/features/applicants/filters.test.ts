import { describe, expect, it } from "vitest";
import { filterApplicants, hasActiveFilters, sortApplicants, matchesSearch } from "./filters";
import { buildMockApplicants } from "./mock";

const all = buildMockApplicants();
const board = all.filter((a) => a.projectSlug === "appointment-setter");

describe("filters", () => {
  it("searches name, email and phone", () => {
    const maria = board.find((a) => a.firstName === "Maria")!;
    expect(matchesSearch(maria, "maria san")).toBe(true);
    expect(matchesSearch(maria, maria.email.slice(0, 6).toUpperCase())).toBe(true);
    expect(matchesSearch(maria, maria.phoneE164.slice(0, 8))).toBe(true);
    expect(matchesSearch(maria, "+63 917")).toBe(true);
    expect(matchesSearch(maria, "zzz")).toBe(false);
  });
  it("does not match phone numbers for names with digits or very short numbers", () => {
    const maria = board.find((a) => a.firstName === "Maria")!;
    expect(matchesSearch(maria, "maria5")).toBe(false);
    expect(matchesSearch(maria, "9")).toBe(false);
  });
  it("applies toggles", () => {
    expect(filterApplicants(board, { audioOnly: true }).every((a) => a.audioOnly)).toBe(true);
    expect(filterApplicants(board, { didTask: true }).every((a) => a.didTask)).toBe(true);
    expect(filterApplicants(board, { appliedBefore: true }).length).toBeGreaterThan(0);
  });
  it("filters by score and date range", () => {
    const scored = filterApplicants(board, { minScore: 4 });
    expect(scored.length).toBeGreaterThan(0);
    expect(scored.every((a) => (a.score ?? 0) >= 4)).toBe(true);
    const ranged = filterApplicants(board, { from: "2026-10-20", to: "2026-10-21" });
    const lo = new Date(2026, 9, 20).getTime();
    const hi = new Date(2026, 9, 22).getTime();
    expect(ranged.every((a) => new Date(a.createdAt).getTime() >= lo && new Date(a.createdAt).getTime() < hi)).toBe(true);
  });
  it("reads the picked days as local days, both ends inclusive", () => {
    const at = (d: Date) => ({ ...board[0], createdAt: d.toISOString() });
    const lastMinute = at(new Date(2026, 9, 5, 23, 59));
    const midnight = at(new Date(2026, 9, 5, 0, 0));
    const nextDay = at(new Date(2026, 9, 6, 0, 0));
    expect(filterApplicants([lastMinute, midnight, nextDay], { from: "2026-10-05", to: "2026-10-05" })).toEqual([lastMinute, midnight]);
  });
  describe("answers", () => {
    const withAnswer = (id: string, qid: string, value: string | number | boolean | string[]) => ({
      ...board[0],
      id,
      answers: { [qid]: { label: "Q", type: "single_choice" as const, value } },
    });
    const a1 = withAnswer("a1", "q-years", "None");
    const a2 = withAnswer("a2", "q-years", "3 to 5 years");
    const a3 = withAnswer("a3", "q-years", "More than 5 years");
    const none = { ...board[0], id: "a4", answers: {} };

    it("keeps applicants whose answer is one of the picked options", () => {
      expect(filterApplicants([a1, a2, a3, none], { answers: { "q-years": ["3 to 5 years"] } })).toEqual([a2]);
    });
    it("matches any option picked for the same question", () => {
      expect(filterApplicants([a1, a2, a3, none], { answers: { "q-years": ["3 to 5 years", "More than 5 years"] } })).toEqual([a2, a3]);
    });
    it("needs every question with a pick to match", () => {
      const both = { ...a2, id: "b", answers: { ...a2.answers, "q-other": { label: "O", type: "single_choice" as const, value: "Yes" } } };
      expect(filterApplicants([a2, both], { answers: { "q-years": ["3 to 5 years"], "q-other": ["Yes"] } })).toEqual([both]);
    });
    it("ignores a question with no picks and hides applicants without that answer otherwise", () => {
      expect(filterApplicants([a1, none], { answers: { "q-years": [] } })).toEqual([a1, none]);
      expect(filterApplicants([a1, none], { answers: { "q-years": ["None"] } })).toEqual([a1]);
    });
    it("counts as an active filter only when something is picked", () => {
      expect(hasActiveFilters({ answers: { "q-years": [] } })).toBe(false);
      expect(hasActiveFilters({ answers: { "q-years": ["None"] } })).toBe(true);
    });
  });
  it("hides test applicants", () => {
    const test = { ...board[0], id: "t", isTest: true };
    expect(filterApplicants([test], {})).toHaveLength(0);
  });
  it("shows test applicants only when asked", () => {
    const test = { ...board[0], id: "t", isTest: true };
    expect(filterApplicants([test], { showTest: true })).toHaveLength(1);
  });
  it("sorts newest and by score", () => {
    const n = sortApplicants(board, "newest");
    expect(n[0].createdAt >= n[n.length - 1].createdAt).toBe(true);
    const s = sortApplicants(board, "score");
    expect(s[0].score ?? 0).toBeGreaterThanOrEqual(s[s.length - 1].score ?? 0);
    expect(board[0]).toBe(board[0]);
  });
});
