import type { tables } from "@/platform/db";
import { ApiError } from "./errors";

type QuestionRow = typeof tables.projectQuestions.$inferSelect;
type Raw = string | number | boolean | string[];
export type SavedAnswers = Record<string, { label: string; type: string; value: Raw }>;

function empty(v: Raw | undefined) {
  return v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
}

function check(q: QuestionRow, v: Raw): Raw | null {
  switch (q.type) {
    case "short_text":
      return typeof v === "string" && v.length <= 200 ? v.trim() : null;
    case "long_text":
      return typeof v === "string" && v.length <= 2000 ? v.trim() : null;
    case "number":
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    case "yes_no":
      return typeof v === "boolean" ? v : null;
    case "single_choice":
      return typeof v === "string" && q.options.includes(v) ? v : null;
    case "multi_choice":
      return Array.isArray(v) && v.every((x) => q.options.includes(x)) ? v : null;
  }
}

/** Keeps answers for the project's active questions, keyed by question id. Throws 400 with per-field messages. */
export function buildAnswers(questions: QuestionRow[], raw: Record<string, Raw>): SavedAnswers {
  const out: SavedAnswers = {};
  const fields: Record<string, string> = {};
  for (const q of questions) {
    if (q.archived) continue;
    const v = raw[q.id];
    if (empty(v)) {
      if (q.required) fields[`q:${q.id}`] = "Answer this question to continue";
      continue;
    }
    const clean = check(q, v as Raw);
    if (clean === null) fields[`q:${q.id}`] = "Check this answer";
    else out[q.id] = { label: q.label, type: q.type, value: clean };
  }
  if (Object.keys(fields).length) throw new ApiError(400, "invalid", "Invalid input", fields);
  return out;
}
