import type { ReactNode } from "react";

/** A titled block in the drawer body. */
export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-line px-6 py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm tracking-wider text-muted">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
