"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/cn";
import { chipClass } from "./filter-chip";

/** Chip that opens a small panel. Closes on Escape, outside click and focus leaving. */
type Props = {
  label: string;
  active: boolean;
  children: (close: () => void) => ReactNode;
  /** Replaces the chip look, e.g. for a row action. */
  buttonClassName?: string;
  icon?: ReactNode;
  panelClassName?: string;
};

export function FilterPopover({ label, active, children, buttonClassName, icon, panelClassName }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          root.current?.querySelector("button")?.focus();
        }
      }}
      onBlur={(e) => {
        if (open && !root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button type="button" className={buttonClassName ?? chipClass(active)} aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen((o) => !o)}>
        {icon}
        {label}
        {!buttonClassName && <ChevronDown className="size-3.5" aria-hidden />}
      </button>
      {open && (
        <div id={panelId} role="group" aria-label={label} className={cn("absolute left-0 top-[calc(100%+6px)] z-20 w-[240px] rounded-lg border border-line bg-white p-3 shadow-lift", panelClassName)}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
