"use client";

import { useState, type ReactNode } from "react";
import type { QuestionDef, QuestionType } from "@/features/projects";
import { typeNeedsOptions } from "../logic/options";
import { validateQuestion, type QuestionErrors } from "../logic/questions";
import { ChoicesEditor, type ChoiceRow } from "./choices-editor";
import { DenseInput, DenseTextArea, SettingRow, Toggle } from "./dense";
import { QuestionTypePicker } from "./question-type-picker";

function toRows(options: string[], seed: string): ChoiceRow[] {
  return options.map((value, i) => ({ id: `${seed}-${i}`, value }));
}

/**
 * Editor for one question. Keeps the raw draft (blank choices included) and reports every change
 * through `onDraft` with its errors, so the parent decides when to save. Errors show after blur.
 */
export function QuestionForm({
  initial,
  onDraft,
  forceErrors,
  footer,
}: {
  initial: QuestionDef;
  onDraft: (draft: QuestionDef, errors: QuestionErrors) => void;
  forceErrors?: boolean;
  footer?: ReactNode;
}) {
  const [draft, setDraft] = useState<QuestionDef>(initial);
  const [rows, setRows] = useState<ChoiceRow[]>(() => toRows(initial.options, initial.id));
  const [touched, setTouched] = useState({ label: false, options: false });

  const errors = validateQuestion(draft);
  const show = (k: "label" | "options") => (forceErrors || touched[k] ? errors[k] : undefined);

  function apply(patch: Partial<QuestionDef>, nextRows: ChoiceRow[] = rows) {
    const next: QuestionDef = { ...draft, ...patch, options: nextRows.map((r) => r.value) };
    setDraft(next);
    setRows(nextRows);
    onDraft(next, validateQuestion(next));
  }

  function changeType(type: QuestionType) {
    const nextRows = typeNeedsOptions(type) && rows.length === 0 ? toRows(["", ""], `${initial.id}-n`) : rows;
    apply({ type }, nextRows);
  }

  return (
    <div className="flex flex-col gap-4">
      <DenseTextArea
        label="Question"
        rows={2}
        value={draft.label}
        error={show("label")}
        onChange={(e) => apply({ label: e.target.value })}
        onBlur={() => setTouched((t) => ({ ...t, label: true }))}
      />
      <QuestionTypePicker value={draft.type} onChange={changeType} />
      <DenseInput label="Help text" optional placeholder="Optional. Shows under the question." value={draft.helpText} onChange={(e) => apply({ helpText: e.target.value })} />
      {typeNeedsOptions(draft.type) && (
        <ChoicesEditor
          rows={rows}
          kind={draft.type === "multi_choice" ? "several" : "one"}
          error={show("options")}
          onChange={(r) => apply({}, r)}
          onBlur={() => setTouched((t) => ({ ...t, options: true }))}
        />
      )}
      <SettingRow
        id={`req-${initial.id}`}
        title="Required"
        description="People must answer before they can go on."
        control={<Toggle checked={draft.required} labelledBy={`req-${initial.id}`} onChange={(v) => apply({ required: v })} />}
      />
      <p className="rounded-lg bg-sand p-3 text-[13.5px] leading-snug text-muted">Old answers keep the label they were given under. Editing this question does not change them.</p>
      {footer}
    </div>
  );
}
