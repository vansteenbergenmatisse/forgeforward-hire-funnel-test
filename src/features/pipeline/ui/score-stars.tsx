import { Star } from "lucide-react";
import { cn } from "@/shared/cn";

/** Read-only score, 1 to 5. Filled stars use amber, empty ones a quiet outline tone. */
export function ScoreStars({ score, className }: { score: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-px", className)} role="img" aria-label={`Score ${score} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={cn("size-3", n <= score ? "fill-amber-dot text-amber-dot" : "fill-line-strong text-line-strong")} />
      ))}
    </span>
  );
}
