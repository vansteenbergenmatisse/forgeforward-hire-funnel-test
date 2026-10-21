import type { ApplicantView } from "@/features/applicants";
import { answerText } from "../lib/answer-text";
import { Section } from "./section";

export function AnswersBlock({ a }: { a: ApplicantView }) {
  const rows = Object.entries(a.answers);
  return (
    <Section title="Answers">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No answers yet.</p>
      ) : (
        <dl className="space-y-3">
          {rows.map(([id, ans]) => (
            <div key={id}>
              <dt className="text-sm text-muted">{ans.label}</dt>
              <dd className="mt-0.5 text-base font-semibold text-charcoal">{answerText(ans)}</dd>
            </div>
          ))}
        </dl>
      )}
    </Section>
  );
}
