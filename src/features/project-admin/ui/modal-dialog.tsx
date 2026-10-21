"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Native <dialog>: focus trap, Escape and backdrop come from the browser. Focus returns to `returnFocusRef` on close. */
export function ModalDialog({
  open,
  onClose,
  title,
  titleId,
  children,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  children: ReactNode;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={() => returnFocusRef?.current?.focus()}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(520px,calc(100vw-32px))] rounded-2xl border border-line bg-white p-0 text-charcoal shadow-lift backdrop:bg-charcoal/50"
    >
      {open && (
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-[26px] leading-none">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-1.5 -mt-1 grid size-9 place-items-center rounded-md text-muted hover:bg-sand hover:text-charcoal">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
