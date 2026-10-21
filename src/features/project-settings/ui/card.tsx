import type { ReactNode } from "react";
import { cn } from "@/shared/cn";

/** White panel with a display title. The basic block of every settings tab. */
export function Card({
  title,
  description,
  actions,
  children,
  className,
  id,
}: {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const titleId = id ? `${id}-title` : undefined;
  return (
    <section aria-labelledby={titleId} className={cn("rounded-xl border border-line bg-white p-5", className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 id={titleId} className="font-sans! text-[19px] font-extrabold! normal-case! leading-tight tracking-normal!">
                {title}
              </h2>
            )}
            {description && <p className="mt-1 text-[14.5px] leading-snug text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Two columns on laptops (form left, side panel right), one column below 1024px. */
export function TwoColumn({ main, side, sideWidth = "420px" }: { main: ReactNode; side: ReactNode; sideWidth?: "380px" | "420px" | "520px" }) {
  const cols = { "380px": "lg:grid-cols-[1fr_380px]", "420px": "lg:grid-cols-[1fr_420px]", "520px": "lg:grid-cols-[1fr_520px]" }[sideWidth];
  return (
    <div className={cn("grid items-start gap-5", cols)}>
      <div className="flex min-w-0 flex-col gap-5">{main}</div>
      <div className="flex min-w-0 flex-col gap-5">{side}</div>
    </div>
  );
}
