import { Star } from "lucide-react";
import { cn } from "@/shared/cn";
import { FilterPopover } from "./filter-popover";

/** "Score" chip. Pick a minimum score, 1 to 5. Unscored applicants are hidden while it is on. */
export function ScoreFilter({ value, onChange }: { value: number | null | undefined; onChange: (v: number | null) => void }) {
  return (
    <FilterPopover label={value ? `Score ${value}+` : "Score"} active={Boolean(value)}>
      {(close) => (
        <>
          <p className="mb-2 text-[12.5px] font-bold text-charcoal">Minimum score</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={value === n}
                aria-label={`${n} or more`}
                onClick={() => {
                  onChange(value === n ? null : n);
                  close();
                }}
                className={cn(
                  "flex h-9 flex-1 items-center justify-center gap-0.5 rounded-md border text-[13px] font-bold focus-visible:outline-2 focus-visible:outline-charcoal",
                  value === n ? "border-charcoal bg-charcoal text-white" : "border-line-strong bg-white text-charcoal hover:bg-sand",
                )}
              >
                {n}
                <Star className="size-3 fill-amber-dot text-amber-dot" aria-hidden />
              </button>
            ))}
          </div>
          {value ? (
            <button type="button" className="mt-2.5 text-[12.5px] font-bold text-muted underline hover:text-charcoal" onClick={() => { onChange(null); close(); }}>
              Clear
            </button>
          ) : null}
        </>
      )}
    </FilterPopover>
  );
}
