import type { ReactNode } from "react";

/** Phone-sized preview frame (390px wide design, shown at a fixed 300px column). */
export function PhoneFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="mx-auto w-[300px] max-w-full rounded-[28px] border-[6px] border-charcoal bg-ivory p-0 shadow-lift">
      <div className="flex min-h-[300px] flex-col rounded-[22px] bg-ivory p-5">{children}</div>
    </div>
  );
}
