import type { AnswerView } from "@/features/applicants";

/** Answers in the project's question order. Answers for archived or removed questions go last, in stored order. */
export function orderAnswers(answers: Record<string, AnswerView>, questionIds: string[]): [string, AnswerView][] {
  const position = new Map(questionIds.map((id, i) => [id, i]));
  const entries = Object.entries(answers);
  const known = entries.filter(([id]) => position.has(id)).sort((a, b) => position.get(a[0])! - position.get(b[0])!);
  const rest = entries.filter(([id]) => !position.has(id));
  return [...known, ...rest];
}
