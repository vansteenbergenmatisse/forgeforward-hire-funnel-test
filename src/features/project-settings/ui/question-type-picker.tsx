"use client";

import { AlignLeft, CircleDot, Hash, ListChecks, ToggleLeft, Type } from "lucide-react";
import type { ComponentType } from "react";
import type { QuestionType } from "@/features/projects";
import { cn } from "@/shared/cn";
import { QUESTION_TYPES } from "../logic/questions";

const ICONS: Record<QuestionType, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  short_text: Type,
  long_text: AlignLeft,
  number: Hash,
  single_choice: CircleDot,
  multi_choice: ListChecks,
  yes_no: ToggleLeft,
};

/** All question types at once, each with an icon and a one-line hint. Native radios, so the keyboard works. */
export function QuestionTypePicker({ value, onChange }: { value: QuestionType; onChange: (type: QuestionType) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[14px] font-bold leading-snug">Type</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {QUESTION_TYPES.map((t) => {
          const Icon = ICONS[t.id];
          const on = value === t.id;
          return (
            <label
              key={t.id}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-charcoal",
                on ? "border-charcoal bg-sand ring-1 ring-charcoal" : "border-line-strong bg-white hover:bg-sand",
              )}
            >
              <input type="radio" name="question-type" className="sr-only" value={t.id} checked={on} onChange={() => onChange(t.id)} />
              <Icon className="size-[18px] shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block text-[14.5px] font-bold leading-tight">{t.label}</span>
                <span className="block text-[12.5px] leading-snug text-muted">{t.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
