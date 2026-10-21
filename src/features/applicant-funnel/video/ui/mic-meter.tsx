import { Mic } from "lucide-react";
import { cn } from "@/shared/cn";

const HEIGHTS = [
  "h-1.5", "h-2.5", "h-3.5", "h-4.5", "h-5.5", "h-4", "h-5", "h-6",
  "h-4.5", "h-3", "h-4", "h-2.5", "h-2", "h-3", "h-1.5", "h-1",
];

/** Live mic level. `level` runs from 0 to 1. */
export function MicMeter({ level }: { level: number }) {
  const lit = Math.round(Math.min(1, Math.max(0, level)) * HEIGHTS.length);
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 py-2.5">
      <Mic className="size-5 flex-none text-charcoal" aria-hidden />
      <div
        className="flex h-6 items-center gap-1"
        role="meter"
        aria-label="Microphone level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(level * 100)}
      >
        {HEIGHTS.map((h, i) => (
          <span key={i} className={cn("w-1.5 rounded-[3px] transition-colors duration-100", h, i < lit ? "bg-ok" : "bg-line-strong")} />
        ))}
      </div>
    </div>
  );
}
