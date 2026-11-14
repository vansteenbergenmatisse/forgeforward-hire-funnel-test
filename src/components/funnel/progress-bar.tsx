import { cn } from "@/shared/cn";

const PARTS = ["Details", "Video", "Task", "Done"] as const;

/** Thin bar, 4 parts (3 when the project has no task). `current` is 1 to 4 and 4 is always Done. Finished parts are red, the current part has bold dark text. */
export function ProgressBar({ current, hasTask = true }: { current: number; hasTask?: boolean }) {
  const parts = hasTask ? PARTS : PARTS.filter((p) => p !== "Task");
  const total = parts.length;
  const now = !hasTask && current >= 4 ? total : current;
  return (
    <div role="progressbar" aria-label={`Step ${now} of ${total}`} aria-valuemin={1} aria-valuemax={total} aria-valuenow={now} className="flex w-full gap-1.5">
      {parts.map((label, i) => {
        const n = i + 1;
        const reached = n <= now;
        return (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <span className={cn("h-1 rounded-xs", reached ? "bg-signal" : "bg-line-strong")} />
            <span
              className={cn(
                "text-[11.5px] tracking-[0.02em] md:text-[12.5px]",
                n === now ? "font-extrabold text-charcoal" : reached ? "font-semibold text-signal-deep" : "font-semibold text-subtle",
              )}
            >
              {label}
              {n === now && <span className="sr-only"> (current step)</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
