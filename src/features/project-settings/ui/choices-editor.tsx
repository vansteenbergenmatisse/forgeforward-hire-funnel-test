"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui";
import { controlClass } from "@/components/forms";
import { moveById } from "../logic/reorder";
import { OPTIONS_MAX, OPTION_MAX_LENGTH } from "../logic/options";
import { SortableList, SortableRow } from "./sortable-list";

export type ChoiceRow = { id: string; value: string };

/** Choices for single and multi choice questions. Drag or use the handle with the keyboard to reorder. */
export function ChoicesEditor({ rows, kind, error, onChange, onBlur }: { rows: ChoiceRow[]; kind: "one" | "several"; error?: string; onChange: (rows: ChoiceRow[]) => void; onBlur?: () => void }) {
  return (
    <div role="group" aria-labelledby="choices-label" aria-describedby={error ? "choices-error" : undefined} className="flex flex-col gap-2">
      <p id="choices-label" className="text-[14px] font-bold leading-snug">
        {kind === "one" ? "Choices (applicants pick one)" : "Choices (applicants pick any number)"}
      </p>
      <SortableList ids={rows.map((r) => r.id)} label="Choices" onMove={(a, o) => onChange(moveById(rows, a, o))} className="flex flex-col gap-1.5">
        {rows.map((r, i) => (
          <SortableRow key={r.id} id={r.id} handleLabel={`Drag choice ${i + 1} to reorder`}>
            {(handle) => (
              <div className="flex items-center gap-1.5">
                {handle}
                <input
                  aria-label={`Choice ${i + 1}`}
                  maxLength={OPTION_MAX_LENGTH}
                  value={r.value}
                  onChange={(e) => onChange(rows.map((x) => (x.id === r.id ? { ...x, value: e.target.value } : x)))}
                  onBlur={onBlur}
                  className={`${controlClass(false)} h-9 text-[15px] pointer-coarse:text-base`}
                />
                <button
                  type="button"
                  aria-label={`Remove choice ${i + 1}`}
                  disabled={rows.length <= 2}
                  title={rows.length <= 2 ? "A question needs at least two choices" : undefined}
                  onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-subtle hover:bg-sand hover:text-charcoal disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </SortableRow>
        ))}
      </SortableList>
      <div>
        <Button size="sm" variant="ghost" disabled={rows.length >= OPTIONS_MAX} icon={<Plus className="size-3.5" />} onClick={() => onChange([...rows, { id: `c-${Date.now().toString(36)}-${rows.length}`, value: "" }])}>
          Add choice
        </Button>
      </div>
      {error && (
        <p id="choices-error" role="alert" className="text-sm font-semibold text-signal-deep">
          {error}
        </p>
      )}
    </div>
  );
}
