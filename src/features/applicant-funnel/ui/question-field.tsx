"use client";

import { AlertCircle } from "lucide-react";
import type { QuestionDef } from "@/features/projects";
import { Checkbox, Field, RadioCard, Segmented, TextArea, TextInput } from "@/components/forms";
import { TextButton } from "@/components/funnel";
import type { AnswerValue } from "../lib/form-validation";
import { ANSWER_LIMITS } from "../schemas";

/** One project question, rendered by type. */
export function QuestionField({
  q,
  id,
  value,
  error,
  onChange,
  onBlur,
}: {
  q: QuestionDef;
  id: string;
  value: AnswerValue | undefined;
  error?: string;
  onChange: (value: AnswerValue | undefined) => void;
  onBlur: () => void;
}) {
  const optional = !q.required;
  const hint = q.helpText || undefined;

  if (q.type === "short_text" || q.type === "long_text" || q.type === "number") {
    const text = value === undefined ? "" : String(value);
    return (
      <Field label={q.label} htmlFor={id} hint={hint} error={error} optional={optional}>
        {q.type === "long_text" ? (
          <TextArea id={id} value={text} maxLength={ANSWER_LIMITS.longText} error={!!error} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <TextInput
            id={id}
            value={text}
            error={!!error}
            maxLength={q.type === "number" ? 40 : ANSWER_LIMITS.shortText}
            inputMode={q.type === "number" ? "decimal" : undefined}
            onBlur={onBlur}
            // Numbers stay as typed text (so "2." and "2,5" survive). They are parsed on submit.
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </Field>
    );
  }

  const selected = Array.isArray(value) ? value : [];
  return (
    <fieldset className="flex min-w-0 flex-col gap-2" onBlur={q.type === "multi_choice" ? undefined : onBlur}>
      <legend className="mb-2 text-base font-bold leading-snug text-charcoal">
        {q.label}
        {optional && <span className="ml-1.5 text-sm font-medium text-subtle">Optional</span>}
      </legend>
      {q.type === "yes_no" && (
        <Segmented
          name={id}
          label={q.label}
          value={value === true ? "yes" : value === false ? "no" : null}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          onChange={(v) => onChange(v === "yes")}
        />
      )}
      {q.type === "single_choice" && (
        <div className="flex flex-col gap-2">
          {q.options.map((o) => (
            <RadioCard key={o} name={id} value={o} label={o} checked={value === o} onChange={onChange} />
          ))}
        </div>
      )}
      {q.type === "multi_choice" && (
        <div className="flex flex-col gap-3" onBlur={onBlur}>
          {q.options.map((o) => (
            <Checkbox
              key={o}
              checked={selected.includes(o)}
              onChange={(on) => onChange(on ? [...selected, o] : selected.filter((x) => x !== o))}
            >
              <span className="text-base font-semibold text-charcoal">{o}</span>
            </Checkbox>
          ))}
        </div>
      )}
      {optional && (q.type === "single_choice" || q.type === "yes_no") && value !== undefined && (
        <TextButton className="self-start" onClick={() => onChange(undefined)}>
          Clear my answer
        </TextButton>
      )}
      {error ? (
        <p role="alert" className="flex items-start gap-1.5 text-sm font-semibold text-signal-deep">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && <p className="text-sm leading-snug text-subtle">{hint}</p>
      )}
    </fieldset>
  );
}
