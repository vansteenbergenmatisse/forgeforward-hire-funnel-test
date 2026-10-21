import { describe, expect, it } from "vitest";
import { MOCK_STAGES } from "@/features/projects";
import { buildApplicantsCsv, escapeCsvCell, toCsv } from "./csv";
import { buildMockApplicants } from "./mock";

describe("csv", () => {
  it("escapes commas, quotes and newlines", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(4)).toBe("4");
  });
  it("neutralises formulas", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
  });
  it("joins rows with CRLF", () => {
    expect(toCsv([["a", "b"], ["c", "d,e"]])).toBe('a,b\r\nc,"d,e"');
  });
  it("builds one row per applicant plus header", () => {
    const list = buildMockApplicants().filter((a) => a.projectSlug === "appointment-setter" && a.stageId);
    const csv = buildApplicantsCsv(list, MOCK_STAGES, "q-years", new Date("2026-10-21T15:42:00Z"));
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(list.length + 1);
    expect(lines[0].startsWith("Name,Email")).toBe(true);
    expect(csv).toContain("Maria Santos");
    expect(csv).toContain("11:42 pm");
  });
});
