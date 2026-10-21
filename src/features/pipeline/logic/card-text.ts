import type { QuestionDef } from "@/features/projects";
import type { ApplicantView } from "@/features/applicants";

/** The question shown on cards, in the table and in the CSV: the first active single-choice question. */
export function primaryQuestion(questions: QuestionDef[]): QuestionDef | null {
  return questions.find((q) => q.type === "single_choice" && !q.archived) ?? null;
}

export function answerText(a: ApplicantView, question: QuestionDef | null): string {
  if (!question) return "";
  const v = a.answers[question.id]?.value;
  return v === undefined || v === null || v === "" ? "" : String(v);
}

/** "3 to 5 years setting" on cards. Other projects show the answer as it is. */
export function cardAnswerLine(a: ApplicantView, question: QuestionDef | null): string {
  const text = answerText(a, question);
  if (!text || !question) return "";
  if (!/year/i.test(question.label)) return text;
  return text === "None" ? "No setting experience" : `${text} setting`;
}

/** Table column title for the primary question. */
export function answerColumnTitle(question: QuestionDef | null): string {
  if (!question) return "Answer";
  return /year/i.test(question.label) ? "Years setting" : "Main answer";
}

/** How far someone got in the funnel, for the "Did not finish" tab. */
export function progressLabel(a: Pick<ApplicantView, "funnelStep" | "media">): "Form only" | "Form + video" {
  return a.funnelStep === "form_done" && !a.media ? "Form only" : "Form + video";
}
