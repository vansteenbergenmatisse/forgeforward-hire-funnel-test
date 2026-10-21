import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/cn";

export const chipClass = (on: boolean) =>
  cn(
    "inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal",
    on ? "border-charcoal bg-charcoal text-white" : "border-line-strong bg-white text-charcoal hover:bg-sand",
  );

/** Toggle chip for a yes or no filter. */
export function FilterChip({ on, className, children, ...rest }: { on: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-pressed={on} className={cn(chipClass(on), className)} {...rest}>
      {children}
    </button>
  );
}
