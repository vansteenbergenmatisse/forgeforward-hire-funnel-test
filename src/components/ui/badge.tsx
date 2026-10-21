import type { ReactNode } from "react";
import { cn } from "@/shared/cn";

export type Tone = "gray" | "blue" | "amber" | "purple" | "teal" | "green" | "red" | "dark";

export const toneClasses: Record<Tone, string> = {
  gray: "bg-gray-tint text-gray",
  blue: "bg-blue-tint text-blue",
  amber: "bg-amber-tint text-amber",
  purple: "bg-purple-tint text-purple",
  teal: "bg-teal-tint text-teal",
  green: "bg-ok-tint text-ok",
  red: "bg-signal-tint text-signal-deep",
  dark: "bg-charcoal text-white",
};

export const toneDot: Record<Tone, string> = {
  gray: "bg-gray",
  blue: "bg-blue",
  amber: "bg-amber-dot",
  purple: "bg-purple",
  teal: "bg-teal",
  green: "bg-ok",
  red: "bg-signal",
  dark: "bg-charcoal",
};

export function Badge({ tone = "gray", dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[12.5px] font-bold", toneClasses[tone], className)}>
      {dot && <span className={cn("size-1.5 rounded-full", toneDot[tone])} />}
      {children}
    </span>
  );
}
