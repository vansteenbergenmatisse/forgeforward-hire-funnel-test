import type { QuestionDef, StageDef } from "@/features/projects";
import { localTime } from "./local-time";
import type { ApplicantView } from "./types";

type Cell = string | number | boolean | null | undefined;

/** A typed E.164 phone number may start with +. Nothing else is trusted to. */
const PHONE_RE = /^\+\d{6,15}$/;

/**
 * Quotes a cell when needed. Text that a spreadsheet could read as a formula (first non-space character is
 * = + - @, or the cell starts with a tab or line break) gets a leading apostrophe. Numbers are left alone.
 * `trusted` skips the formula guard for values the code produced itself.
 */
export function escapeCsvCell(value: Cell, opts: { trusted?: boolean } = {}): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (typeof value === "string" && !opts.trusted && /^[\t\r\n]|^\s*[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** `phoneColumn` is the index of a column that may hold a plain +E.164 number. */
export function toCsv(rows: Cell[][], opts: { phoneColumn?: number } = {}): string {
  return rows
    .map((r) => r.map((c, i) => escapeCsvCell(c, { trusted: i === opts.phoneColumn && typeof c === "string" && PHONE_RE.test(c) })).join(","))
    .join("\r\n");
}

const PHONE_COLUMN = 2;

/** One row per applicant, in the order given. `question` is the answer shown in its own column, named after the question. */
export function buildApplicantsCsv(
  applicants: ApplicantView[],
  stages: StageDef[],
  question: Pick<QuestionDef, "id" | "label"> | null,
  now: Date = new Date(),
): string {
  const stageName = (id: string | null) => (id === null ? "Did not finish" : (stages.find((s) => s.id === id)?.name ?? ""));
  const header = ["Name", "Email", "Phone", "Country", "Stage", ...(question ? [question.label] : []), "Did task", "Audio only", "Applied before", "Score", "Local time", "Applied", "Notes"];
  const rows = applicants.map((a) => [
    `${a.firstName} ${a.lastName}`,
    a.email,
    a.phoneE164,
    a.phoneCountry,
    stageName(a.stageId),
    ...(question ? [answerCell(a.answers[question.id]?.value)] : []),
    a.didTask ? "Yes" : "No",
    a.audioOnly ? "Yes" : "No",
    a.appliedBefore ? "Yes" : "No",
    a.score,
    localTime(a.timezone, now),
    a.createdAt.slice(0, 10),
    a.notes,
  ]);
  return toCsv([header, ...rows], { phoneColumn: PHONE_COLUMN });
}

function answerCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  return Array.isArray(value) ? value.join(", ") : String(value);
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
  // Some browsers start the download after click() returns, so the URL must outlive it.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
