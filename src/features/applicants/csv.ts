import type { StageDef } from "@/features/projects";
import { localTime } from "./local-time";
import type { ApplicantView } from "./types";

/** Quotes a cell when needed. Cells that start with = or @ get a leading apostrophe so spreadsheets do not run them. */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  return rows.map((r) => r.map(escapeCsvCell).join(",")).join("\r\n");
}

const HEADER = ["Name", "Email", "Phone", "Country", "Stage", "Years setting", "Did task", "Audio only", "Applied before", "Score", "Local time", "Applied", "Notes"];

/** One row per applicant, in the order given. `yearsQuestionId` picks the answer shown in the "Years setting" column. */
export function buildApplicantsCsv(applicants: ApplicantView[], stages: StageDef[], yearsQuestionId: string, now: Date = new Date()): string {
  const stageName = (id: string | null) => (id === null ? "Did not finish" : (stages.find((s) => s.id === id)?.name ?? ""));
  const rows = applicants.map((a) => [
    `${a.firstName} ${a.lastName}`,
    a.email,
    a.phoneE164,
    a.phoneCountry,
    stageName(a.stageId),
    String(a.answers[yearsQuestionId]?.value ?? ""),
    a.didTask ? "Yes" : "No",
    a.audioOnly ? "Yes" : "No",
    a.appliedBefore ? "Yes" : "No",
    a.score,
    localTime(a.timezone, now),
    a.createdAt.slice(0, 10),
    a.notes,
  ]);
  return toCsv([HEADER, ...rows]);
}

/** Triggers a browser download. Browser only. */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
