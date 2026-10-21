import { FilterPopover } from "./filter-popover";

const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function dateRangeLabel(from?: string | null, to?: string | null): string {
  if (from && to) return `${fmt(from)} to ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `Until ${fmt(to)}`;
  return "Date range";
}

const inputClass = "mt-1 h-9 w-full rounded-md border border-line-strong bg-white px-2 text-[13px] text-charcoal focus-visible:outline-2 focus-visible:outline-charcoal";

/** "Date range" chip with from and to dates (the day the application was created). */
export function DateFilter({ from, to, onChange }: { from?: string | null; to?: string | null; onChange: (v: { from: string | null; to: string | null }) => void }) {
  return (
    <FilterPopover label={dateRangeLabel(from, to)} active={Boolean(from || to)}>
      {() => (
        <div className="flex flex-col gap-2.5">
          <label className="text-[12.5px] font-bold text-charcoal">
            From
            <input type="date" className={inputClass} value={from ?? ""} max={to ?? undefined} onChange={(e) => onChange({ from: e.target.value || null, to: to ?? null })} />
          </label>
          <label className="text-[12.5px] font-bold text-charcoal">
            To
            <input type="date" className={inputClass} value={to ?? ""} min={from ?? undefined} onChange={(e) => onChange({ from: from ?? null, to: e.target.value || null })} />
          </label>
          {(from || to) && (
            <button type="button" className="self-start text-[12.5px] font-bold text-muted underline hover:text-charcoal" onClick={() => onChange({ from: null, to: null })}>
              Clear dates
            </button>
          )}
        </div>
      )}
    </FilterPopover>
  );
}
