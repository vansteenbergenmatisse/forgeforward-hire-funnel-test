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
  it("neutralises formulas, including + and - and leading blanks", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCsvCell("+HYPERLINK(1)")).toBe("'+HYPERLINK(1)");
    expect(escapeCsvCell("-2+3+cmd|' /C calc'!A0")).toBe("\'-2+3+cmd|' /C calc'!A0");
    expect(escapeCsvCell("  =1+1")).toBe("'  =1+1");
    expect(escapeCsvCell("\t=1")).toBe("'\t=1");
    expect(escapeCsvCell("\n=1")).toBe("\"'\n=1\"");
  });
  it("leaves numbers and ordinary text alone", () => {
    expect(escapeCsvCell(-3)).toBe("-3");
    expect(escapeCsvCell("Anne-Marie")).toBe("Anne-Marie");
  });
  it("keeps a typed phone number readable but guards other values in that column", () => {
    expect(toCsv([["+639171234567"]], { phoneColumn: 0 })).toBe("+639171234567");
    expect(toCsv([["+1;cmd"]], { phoneColumn: 0 })).toBe("'+1;cmd");
    expect(toCsv([["+639171234567"]])).toBe("'+639171234567");
  });
  it("joins rows with CRLF", () => {
    expect(toCsv([["a", "b"], ["c", "d,e"]])).toBe('a,b\r\nc,"d,e"');
  });
  it("builds one row per applicant plus header", () => {
    const list = buildMockApplicants().filter((a) => a.projectSlug === "appointment-setter" && a.stageId);
    const csv = buildApplicantsCsv(list, MOCK_STAGES, { id: "q-years", label: "Years in the chair" }, new Date("2026-10-21T15:42:00Z"));
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(list.length + 1);
    expect(lines[0].startsWith("Name,Email")).toBe(true);
    expect(lines[0]).toContain("Years in the chair");
    expect(buildApplicantsCsv(list, MOCK_STAGES, null).split("\r\n")[0]).not.toContain("Years");
    expect(csv).toContain("Maria Santos");
    expect(csv).toContain("11:42 pm");
  });
});
