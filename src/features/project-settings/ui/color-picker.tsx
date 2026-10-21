"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { toneDot } from "@/components/ui";
import type { StageColor } from "@/features/projects";
import { cn } from "@/shared/cn";
import { STAGE_COLORS } from "../logic/stages";

const NAMES: Record<StageColor, string> = { gray: "Gray", blue: "Blue", amber: "Amber", purple: "Purple", teal: "Teal", green: "Green", red: "Red" };

/** A swatch button that opens a row of the 7 stage colors. Closes on pick, Escape or when focus leaves. */
export function ColorPicker({ value, stageName, onChange }: { value: StageColor; stageName: string; onChange: (c: StageColor) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <button
        ref={button}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Color for ${stageName}: ${NAMES[value]}. Change color`}
        onClick={() => setOpen((o) => !o)}
        className={cn("size-7 rounded-md ring-1 ring-black/10", toneDot[value])}
      />
      {open && (
        <div role="radiogroup" aria-label={`Color for ${stageName}`} className="absolute left-0 top-9 z-20 flex gap-1.5 rounded-lg border border-line bg-white p-2 shadow-lift">
          {STAGE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={c === value}
              aria-label={NAMES[c]}
              autoFocus={c === value}
              onClick={() => {
                onChange(c);
                setOpen(false);
                button.current?.focus();
              }}
              className={cn("grid size-7 place-items-center rounded-md text-white ring-1 ring-black/10", toneDot[c])}
            >
              {c === value && <Check className="size-4" strokeWidth={3} aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
