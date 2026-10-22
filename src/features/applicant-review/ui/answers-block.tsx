import type { ApplicantView } from "@/features/applicants";
import { answerText } from "../lib/answer-text";
import { orderAnswers } from "../lib/order-answers";
import { Section } from "./section";

export function AnswersBlock({ a, questionIds }: { a: ApplicantView; questionIds: string[] }) {
  const rows = orderAnswers(a.answers, questionIds);
  return (
    <Section title="Answers">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No answers yet.</p>
      ) : (
        <dl className="space-y-3">
          {rows.map(([id, ans]) => (
            <div key={id}>
              <dt className="text-sm text-muted">{ans.label}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-base font-semibold text-charcoal">{answerText(ans)}</dd>
            </div>
          ))}
        </dl>
      )}
    </Section>
  );
}
