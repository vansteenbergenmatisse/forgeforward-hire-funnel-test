"use client";

import type { ReactNode } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import type { ApplicantFilters } from "@/features/applicants";
import { DateFilter } from "./date-filter";
import { FilterChip } from "./filter-chip";
import { ScoreFilter } from "./score-filter";

export type SortOption = { value: string; label: string };

type Props = {
  filters: ApplicantFilters;
  onFilters: (f: ApplicantFilters) => void;
  sortValue: string;
  sortOptions: SortOption[];
  onSort: (value: string) => void;
  /** Text left of the sort select, e.g. "Rows: 24". */
  summary?: ReactNode;
};

/** Search, filter chips and sort. Shared by Board, Did not finish and Table. */
export function Toolbar({ filters, onFilters, sortValue, sortOptions, onSort, summary }: Props) {
  const set = (patch: Partial<ApplicantFilters>) => onFilters({ ...filters, ...patch });
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" role="search">
      <div className="relative w-[300px] max-w-full">
        <label htmlFor="pipeline-search" className="sr-only">
          Search name, email or phone
        </label>
        <input
          id="pipeline-search"
          type="search"
          value={filters.search ?? ""}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Search name, email or phone"
          className="h-10 w-full appearance-none rounded-[9px] border border-line-strong bg-white pl-3 pr-9 text-sm pointer-coarse:text-base text-charcoal placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-charcoal [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.search ? (
          <button type="button" aria-label="Clear search" onClick={() => set({ search: "" })} className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-sand focus-visible:outline-2 focus-visible:outline-charcoal">
            <X className="size-4" aria-hidden />
          </button>
        ) : (
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-charcoal" aria-hidden />
        )}
      </div>
      <FilterChip on={Boolean(filters.didTask)} onClick={() => set({ didTask: !filters.didTask })}>
        Did task
      </FilterChip>
      <FilterChip on={Boolean(filters.audioOnly)} onClick={() => set({ audioOnly: !filters.audioOnly })}>
        Audio only
      </FilterChip>
      <FilterChip on={Boolean(filters.appliedBefore)} onClick={() => set({ appliedBefore: !filters.appliedBefore })}>
        Applied before
      </FilterChip>
      <ScoreFilter value={filters.minScore} onChange={(minScore) => set({ minScore })} />
      <DateFilter from={filters.from} to={filters.to} onChange={(r) => set(r)} />
      <div className="ml-auto flex items-center gap-2 text-[13px] text-muted">
        {summary}
        <label htmlFor="pipeline-sort">Sort</label>
        <div className="relative">
          <select
            id="pipeline-sort"
            value={sortValue}
            onChange={(e) => onSort(e.target.value)}
            className="h-[34px] w-[150px] appearance-none rounded-[9px] border border-line-strong bg-white pl-3 pr-8 text-sm pointer-coarse:text-base text-charcoal focus-visible:outline-2 focus-visible:outline-charcoal"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-charcoal" aria-hidden />
        </div>
      </div>
    </div>
  );
}
