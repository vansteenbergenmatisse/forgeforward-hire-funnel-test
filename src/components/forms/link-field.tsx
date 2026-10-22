"use client";

import { cn } from "@/shared/cn";

/** Shows a full link in a read-only field that selects itself on tap, for when copy buttons are blocked. */
export function LinkField({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <input
      readOnly
      aria-label={label}
      value={value}
      onFocus={(e) => e.currentTarget.select()}
      onClick={(e) => e.currentTarget.select()}
      className={cn(
        "h-12 w-full rounded-xl border border-line-strong bg-sand px-3.5 text-left text-sm font-semibold text-charcoal focus:border-charcoal focus:outline-none",
        className,
      )}
    />
  );
}
