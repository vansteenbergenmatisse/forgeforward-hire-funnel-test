import type { ReactNode } from "react";
import { cn } from "@/shared/cn";

type Props = {
  children: ReactNode;
  footer?: ReactNode;
  /** A04 uses a narrower card on laptop. */
  narrow?: boolean;
  /** Announces the screen to assistive tech when it changes. */
  label?: string;
};

/** Phone: content fills the screen, button pinned at the bottom. Laptop: one centered card. */
export function FlowScreen({ children, footer, narrow, label }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:items-center md:px-10 md:pb-10 md:pt-12" aria-label={label}>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col md:w-full md:flex-none md:rounded-[20px] md:border md:border-line md:bg-white md:px-10 md:pb-8 md:pt-9 md:shadow-lift",
          narrow ? "md:max-w-[560px]" : "md:max-w-[720px]",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col px-5 pt-5 md:flex-none md:p-0">{children}</div>
        {footer ? <div className="flex flex-none flex-col gap-2 px-5 pb-7 pt-3 md:px-0 md:pb-0 md:pt-6">{footer}</div> : null}
      </div>
    </div>
  );
}

export function IconBadge({ children, size = "md" }: { children: ReactNode; size?: "md" | "lg" }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-signal-tint text-signal",
        size === "lg" ? "size-16 md:size-[76px]" : "size-16",
      )}
    >
      {children}
    </div>
  );
}

export function Notice({ children, tone = "warn" }: { children: ReactNode; tone?: "warn" | "info" }) {
  return (
    <p
      role="status"
      className={cn(
        "mb-4 rounded-xl border px-4 py-3 text-[15px] font-semibold",
        tone === "warn" ? "border-amber-dot bg-amber-tint text-amber" : "border-line-strong bg-sand text-charcoal",
      )}
    >
      {children}
    </p>
  );
}
