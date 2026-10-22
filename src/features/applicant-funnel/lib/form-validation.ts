import "@/shared/zod-jitless";
import { z } from "zod";
import { parsePhone } from "@/shared/phone";
import type { QuestionDef } from "@/features/projects";
import { ANSWER_LIMITS } from "../schemas";

export type AnswerValue = string | number | boolean | string[];

export type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  whatsappOk: boolean | null;
  timezone: string;
  answers: Record<string, AnswerValue | undefined>;
  consent: boolean;
};

/** Keys are field ids: firstName, lastName, email, phone, whatsappOk, timezone, consent, or `q:<questionId>`. */
export type FormErrors = Record<string, string>;

export const MSG = {
  firstName: "Enter your first name",
  lastName: "Enter your last name",
  email: "Enter a valid email",
  phone: "Check your phone number",
  whatsappOk: "Pick Yes or No",
  timezone: "Pick your time zone",
  consent: "Tick the box to continue",
  required: "Answer this question to continue",
  number: "Enter a number",
  shortText: `Keep it under ${ANSWER_LIMITS.shortText} characters`,
  longText: `Keep it under ${ANSWER_LIMITS.longText.toLocaleString("en-US")} characters`,
} as const;

/** Reads a typed number. Accepts a comma as the decimal mark. Returns null when it is not a finite number. */
export function parseNumberAnswer(v: AnswerValue | undefined): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim().replace(",", ".");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const emailSchema = z.email();

export function questionKey(id: string) {
  return `q:${id}`;
}

export function activeQuestions(questions: QuestionDef[]): QuestionDef[] {
  return questions.filter((q) => !q.archived);
}

function isEmpty(v: AnswerValue | undefined): boolean {
  if (v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Validates one field. Returns the message or null. */
export function validateField(key: string, v: FormValues, questions: QuestionDef[]): string | null {
  switch (key) {
    case "firstName": {
      const s = v.firstName.trim();
      return s.length < 1 || s.length > 60 ? MSG.firstName : null;
    }
    case "lastName": {
      const s = v.lastName.trim();
      return s.length < 1 || s.length > 60 ? MSG.lastName : null;
    }
    case "email":
      return emailSchema.safeParse(v.email.trim()).success ? null : MSG.email;
    case "phone":
      return parsePhone(v.phone, v.country) ? null : MSG.phone;
    case "whatsappOk":
      return v.whatsappOk === null ? MSG.whatsappOk : null;
    case "timezone":
      return v.timezone ? null : MSG.timezone;
    case "consent":
      return v.consent ? null : MSG.consent;
    default: {
      if (!key.startsWith("q:")) return null;
      const q = questions.find((x) => questionKey(x.id) === key);
      if (!q || q.archived) return null;
      const a = v.answers[q.id];
      if (isEmpty(a)) return q.required ? MSG.required : null;
      if (q.type === "number" && parseNumberAnswer(a) === null) return MSG.number;
      if (q.type === "short_text" && typeof a === "string" && a.length > ANSWER_LIMITS.shortText) return MSG.shortText;
      if (q.type === "long_text" && typeof a === "string" && a.length > ANSWER_LIMITS.longText) return MSG.longText;
      return null;
    }
  }
}

/** Field keys in the order they appear on screen. */
export function fieldOrder(questions: QuestionDef[]): string[] {
  return [
    "firstName",
    "lastName",
    "email",
    "phone",
    "whatsappOk",
    "timezone",
    ...activeQuestions(questions).map((q) => questionKey(q.id)),
    "consent",
  ];
}

export function validateForm(v: FormValues, questions: QuestionDef[]): FormErrors {
  const errors: FormErrors = {};
  for (const key of fieldOrder(questions)) {
    const m = validateField(key, v, questions);
    if (m) errors[key] = m;
  }
  return errors;
}

export function countErrors(errors: FormErrors): number {
  return Object.keys(errors).length;
}

export function errorSummary(count: number): string {
  return `${count} ${count === 1 ? "thing needs" : "things need"} a fix. We kept everything you typed.`;
}

export function firstErrorKey(errors: FormErrors, questions: QuestionDef[]): string | null {
  return fieldOrder(questions).find((k) => errors[k]) ?? null;
}
