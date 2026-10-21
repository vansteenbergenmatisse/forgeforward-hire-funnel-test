import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/cn";

/** Quiet underlined action under the main button (Skip task, Continue here anyway). 48px tap target. */
export function TextButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-1.5 text-[15px] font-semibold text-muted underline underline-offset-[3px] hover:text-charcoal disabled:opacity-50",
        className,
      )}
      {...rest}
    />
  );
}
