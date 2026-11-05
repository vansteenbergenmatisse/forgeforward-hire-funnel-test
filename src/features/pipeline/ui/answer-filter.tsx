import type { QuestionDef } from "@/features/projects";
import { FilterPopover } from "./filter-popover";

const LABEL_MAX = 24;
const short = (s: string) => (s.length > LABEL_MAX ? `${s.slice(0, LABEL_MAX - 1).trimEnd()}…` : s);

/** One chip per choice question. Pick any options. Applicants whose answer is one of them stay. */
export function AnswerFilter({ question, picked, onChange }: { question: QuestionDef; picked: string[]; onChange: (next: string[]) => void }) {
  const toggle = (option: string) => onChange(picked.includes(option) ? picked.filter((o) => o !== option) : [...picked, option]);
  return (
    <FilterPopover label={picked.length ? `${short(question.label)} (${picked.length})` : short(question.label)} active={picked.length > 0} panelClassName="w-[280px]">
      {() => (
        <>
          <p className="mb-2 text-[12.5px] font-bold text-charcoal">{question.label}</p>
          <ul className="space-y-0.5">
            {question.options.map((option) => (
              <li key={option}>
                <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm text-charcoal hover:bg-sand">
                  <input type="checkbox" checked={picked.includes(option)} onChange={() => toggle(option)} className="size-4 accent-charcoal" />
                  {option}
                </label>
              </li>
            ))}
          </ul>
          {picked.length > 0 && (
            <button type="button" className="mt-2.5 text-[12.5px] font-bold text-muted underline hover:text-charcoal" onClick={() => onChange([])}>
              Clear
            </button>
          )}
        </>
      )}
    </FilterPopover>
  );
}
