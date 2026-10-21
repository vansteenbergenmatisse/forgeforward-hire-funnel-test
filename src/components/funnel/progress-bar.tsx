import { cn } from "@/shared/cn";

const PARTS = ["Details", "Video", "Task", "Done"] as const;

/** Thin 4-part bar. `current` is 1 to 4. Finished parts are red, the current part has bold dark text. */
export function ProgressBar({ current }: { current: number }) {
  return (
    <div role="progressbar" aria-label={`Step ${current} of 4`} aria-valuemin={1} aria-valuemax={4} aria-valuenow={current} className="flex w-full gap-1.5">
      {PARTS.map((label, i) => {
        const n = i + 1;
        const reached = n <= current;
        return (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <span className={cn("h-1 rounded-xs", reached ? "bg-signal" : "bg-line-strong")} />
            <span
              className={cn(
                "text-[11.5px] tracking-[0.02em] md:text-[12.5px]",
                n === current ? "font-extrabold text-charcoal" : reached ? "font-semibold text-signal-deep" : "font-semibold text-subtle",
              )}
            >
              {label}
              {n === current && <span className="sr-only"> (current step)</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
