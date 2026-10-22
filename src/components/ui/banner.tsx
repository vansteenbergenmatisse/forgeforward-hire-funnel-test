import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/shared/cn";

type Tone = "error" | "warning";

const tones: Record<Tone, string> = {
  error: "bg-signal-tint text-signal-deep",
  warning: "bg-amber-tint text-amber",
};

/** Inline notice with an optional action (for example Retry). Errors are announced at once, warnings politely. */
export function Banner({ tone = "error", children, action, className }: { tone?: Tone; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold", tones[tone], className)}>
      <AlertTriangle className="size-[18px] shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  );
}
