import { describe, expect, it } from "vitest";
import { MOCK_STAGES } from "@/features/projects";
import type { ApplicantView } from "@/features/applicants";
import { nextTableSort, sortTableRows } from "./table-sort";

const mk = (id: string, over: Partial<ApplicantView>) =>
  ({ id, firstName: id, lastName: "X", stageId: MOCK_STAGES[0].id, answers: {}, didTask: false, score: null, timezone: "UTC", createdAt: "2026-10-01T00:00:00Z", ...over }) as ApplicantView;
const ctx = { stages: MOCK_STAGES, question: null, now: new Date("2026-10-21T12:00:00Z") };

describe("table sort", () => {
  it("toggles direction on the same header and picks a default on a new one", () => {
    expect(nextTableSort({ key: "name", dir: "asc" }, "name")).toEqual({ key: "name", dir: "desc" });
    expect(nextTableSort({ key: "name", dir: "asc" }, "score")).toEqual({ key: "score", dir: "desc" });
    expect(nextTableSort({ key: "score", dir: "desc" }, "name")).toEqual({ key: "name", dir: "asc" });
  });
  it("sorts by name", () => {
    const rows = [mk("bea", {}), mk("amy", {})];
    expect(sortTableRows(rows, { key: "name", dir: "asc" }, ctx).map((r) => r.id)).toEqual(["amy", "bea"]);
  });
  it("sorts by stage order", () => {
    const rows = [mk("a", { stageId: MOCK_STAGES[3].id }), mk("b", { stageId: MOCK_STAGES[1].id })];
    expect(sortTableRows(rows, { key: "stage", dir: "asc" }, ctx).map((r) => r.id)).toEqual(["b", "a"]);
  });
  it("sorts by score with unscored last when descending", () => {
    const rows = [mk("a", { score: null }), mk("b", { score: 5 }), mk("c", { score: 3 })];
    expect(sortTableRows(rows, { key: "score", dir: "desc" }, ctx).map((r) => r.id)).toEqual(["b", "c", "a"]);
  });
  it("sorts by local time of day", () => {
    const rows = [mk("noon", { timezone: "UTC" }), mk("morning", { timezone: "America/New_York" })];
    const out = sortTableRows(rows, { key: "localTime", dir: "asc" }, ctx).map((r) => r.id);
    expect(out).toEqual(["morning", "noon"]);
  });
});
