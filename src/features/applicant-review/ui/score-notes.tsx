"use client";

import { Check, Loader2, Star } from "lucide-react";
import type { ApplicantActions, ApplicantView } from "@/features/applicants";
import { cn } from "@/shared/cn";
import { nextScore, scoreLabel } from "../lib/score";
import { Section } from "./section";
import { useAutosave } from "./use-autosave";

export function ScoreNotes({ a, actions }: { a: ApplicantView; actions: Pick<ApplicantActions, "setScore" | "setNotes"> }) {
  const notes = useAutosave(a.notes, (v) => actions.setNotes(a.id, v));
  return (
    <Section title="Score and notes" aside={<span className="text-sm font-bold text-charcoal">{scoreLabel(a.score)}</span>}>
      <div className="flex items-center gap-1" role="group" aria-label="Score from 1 to 5">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = a.score !== null && n <= a.score;
          return (
            <button
              key={n}
              type="button"
              onClick={() => actions.setScore(a.id, nextScore(a.score, n))}
              aria-pressed={a.score === n}
              aria-label={`${n} of 5${a.score === n ? ", click to clear" : ""}`}
              className="grid size-10 place-items-center rounded-lg hover:bg-sand"
            >
              <Star className={cn("size-6", on ? "fill-amber-dot text-amber-dot" : "text-line-strong")} aria-hidden />
            </button>
          );
        })}
      </div>
      <label htmlFor="drawer-notes" className="mt-4 block text-sm font-bold text-charcoal">Notes</label>
      <textarea
        id="drawer-notes"
        value={notes.value}
        onChange={(e) => notes.change(e.target.value)}
        onBlur={notes.flush}
        rows={4}
        placeholder="What stood out?"
        className="mt-1.5 w-full resize-y rounded-xl border border-line-strong bg-white px-3.5 py-3 text-sm leading-relaxed text-charcoal placeholder:text-placeholder focus:border-charcoal focus:outline-none"
      />
      <p className="mt-1.5 flex h-5 items-center gap-1.5 text-[13px] text-muted" role="status" aria-live="polite">
        {notes.state === "saving" && (<><Loader2 className="size-3.5 animate-spin" aria-hidden />Saving...</>)}
        {notes.state === "saved" && (<><Check className="size-3.5 text-ok" aria-hidden /><span className="font-semibold text-ok">Saved</span></>)}
      </p>
    </Section>
  );
}
