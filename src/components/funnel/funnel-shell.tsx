import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { cn } from "@/shared/cn";
import { ProgressBar } from "./progress-bar";

/** Page frame for every funnel step: logo + progress on top, one column on phones, a white card from `md`. */
export function FunnelShell({ step, children }: { step: number; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory text-charcoal">
      <header className="shrink-0 px-5 pt-3.5 md:grid md:grid-cols-[minmax(max-content,1fr)_minmax(0,560px)_minmax(0,1fr)] md:items-center md:gap-6 md:border-b md:border-line md:bg-white md:px-10 md:py-[22px]">
        <div className="flex justify-center md:justify-start">
          <Logo height={22} />
        </div>
        <div className="mt-3.5 md:mt-0">
          <ProgressBar current={step} />
        </div>
      </header>
      <main className="flex flex-1 flex-col md:items-center md:px-10 md:pb-10 md:pt-12">
        <div className="flex w-full flex-1 flex-col md:w-[560px] md:flex-none md:rounded-[20px] md:border md:border-line md:bg-white md:px-10 md:pb-8 md:pt-9 md:shadow-[0_30px_60px_-44px_rgb(14_18_32/0.35)]">
          {children}
        </div>
      </main>
    </div>
  );
}

/** Scrolling content of a step. */
export function StepBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex-1 px-5 pb-6 pt-[22px] md:flex-none md:p-0", className)}>{children}</div>;
}

/** Actions: pinned to the bottom on phones, inline under the content from `md`. */
export function StepFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-col gap-1.5 bg-ivory px-5 pb-7 pt-3 md:static md:mt-[26px] md:bg-transparent md:p-0">{children}</div>
  );
}
