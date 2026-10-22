import { describe, expect, it } from "vitest";
import { filterApplicants, sortApplicants, matchesSearch } from "./filters";
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
