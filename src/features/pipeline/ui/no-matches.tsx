import { SearchX } from "lucide-react";
import { Button } from "@/components/ui";

/** Shown when search and filters hide everyone. */
export function NoMatches({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong bg-white px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-sand text-muted">
        <SearchX className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-charcoal">No applicants match.</p>
      <Button variant="secondary" size="sm" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
