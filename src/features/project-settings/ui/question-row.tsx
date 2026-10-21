import { Archive, RotateCcw } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import type { QuestionDef } from "@/features/projects";
import { cn } from "@/shared/cn";
import { typeLabel } from "../logic/questions";
import { SortableRow } from "./sortable-list";

/** One question in the list: handle, label button (opens the editor), type and required badges. */
export function QuestionRow({ q, selected, onSelect }: { q: QuestionDef; selected: boolean; onSelect: () => void }) {
  return (
    <SortableRow id={q.id} handleLabel={`Drag "${q.label}" to reorder`}>
      {(handle) => (
        <div className={cn("flex items-center gap-1 rounded-lg border bg-white py-1.5 pl-1.5 pr-2.5", selected ? "border-charcoal ring-1 ring-charcoal" : "border-line")}>
          {handle}
          <button type="button" onClick={onSelect} aria-pressed={selected} className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md py-1.5 text-left">
            <span className="truncate text-[15px] font-bold">{q.label}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              <Badge>{typeLabel(q.type)}</Badge>
              <Badge tone={q.required ? "red" : "gray"}>{q.required ? "Required" : "Optional"}</Badge>
            </span>
          </button>
        </div>
      )}
    </SortableRow>
  );
}

export function ArchivedRow({ q, onRestore }: { q: QuestionDef; onRestore: () => void }) {
  return (
    <li className="flex list-none items-center gap-2 rounded-lg border border-line bg-sand/50 py-1.5 pl-3 pr-2.5">
      <Archive className="size-4 shrink-0 text-subtle" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-muted">{q.label}</span>
      <Badge>{typeLabel(q.type)}</Badge>
      <Badge>Archived</Badge>
      <Button size="sm" variant="secondary" icon={<RotateCcw className="size-3.5" />} onClick={onRestore} aria-label={`Restore "${q.label}"`}>
        Restore
      </Button>
    </li>
  );
}
