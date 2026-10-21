import type { QuestionDef, QuestionType } from "@/features/projects";
import { normalizeOptions, typeNeedsOptions, validateOptions } from "./options";

export const QUESTION_TYPES: { id: QuestionType; label: string }[] = [
  { id: "short_text", label: "Short text" },
  { id: "long_text", label: "Long text" },
  { id: "number", label: "Number" },
  { id: "single_choice", label: "Single choice" },
  { id: "multi_choice", label: "Multi choice" },
  { id: "yes_no", label: "Yes or no" },
];

export function typeLabel(type: QuestionType): string {
  return QUESTION_TYPES.find((t) => t.id === type)?.label ?? type;
}

export const FIXED_FIELDS = [
  { label: "First name", kind: "Short text" },
  { label: "Last name", kind: "Short text" },
  { label: "Email", kind: "Email" },
  { label: "Phone", kind: "Phone" },
  { label: "Can we contact you on WhatsApp?", kind: "Yes or no" },
  { label: "Your time zone", kind: "Time zone" },
] as const;

export type QuestionErrors = Partial<Record<"label" | "options", string>>;

export function validateQuestion(q: Pick<QuestionDef, "label" | "type" | "options">): QuestionErrors {
  const errors: QuestionErrors = {};
  if (q.label.trim() === "") errors.label = "Write the question people will read.";
  else if (q.label.trim().length > 200) errors.label = "Use 200 characters or fewer.";
  const o = validateOptions(q.type, q.options);
  if (o) errors.options = o;
  return errors;
}

/** What gets stored: trimmed text, normalized choices only for choice types. */
export function normalizeQuestion(q: QuestionDef): QuestionDef {
  return { ...q, label: q.label.trim(), helpText: q.helpText.trim(), options: typeNeedsOptions(q.type) ? normalizeOptions(q.options) : [] };
}

export function blankQuestion(id: string): QuestionDef {
  return { id, label: "", helpText: "", type: "short_text", options: [], required: false, archived: false };
}

/** Archive instead of delete: old answers keep their label. Restore reverses it. */
export function setArchived(list: readonly QuestionDef[], id: string, archived: boolean): QuestionDef[] {
  return list.map((q) => (q.id === id ? { ...q, archived } : q));
}
