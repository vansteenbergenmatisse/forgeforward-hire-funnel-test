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
    expect(ranged.every((a) => a.createdAt.slice(0, 10) >= "2026-10-20")).toBe(true);
  });
  it("hides test applicants", () => {
    const test = { ...board[0], id: "t", isTest: true };
    expect(filterApplicants([test], {})).toHaveLength(0);
  });
  it("sorts newest and by score", () => {
    const n = sortApplicants(board, "newest");
    expect(n[0].createdAt >= n[n.length - 1].createdAt).toBe(true);
    const s = sortApplicants(board, "score");
    expect(s[0].score ?? 0).toBeGreaterThanOrEqual(s[s.length - 1].score ?? 0);
    expect(board[0]).toBe(board[0]);
  });
});
