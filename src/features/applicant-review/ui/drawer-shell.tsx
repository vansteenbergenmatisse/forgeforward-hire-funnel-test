"use client";

import type { ReactNode } from "react";
import { useDialogBehavior } from "./use-dialog-behavior";

/** Overlay plus right side panel. Focus trap, Escape and overlay click close, focus returns to the opener. */
export function DrawerShell({ onClose, labelledBy, children }: { onClose: () => void; labelledBy: string; children: ReactNode }) {
  const panel = useDialogBehavior(onClose);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-charcoal/50" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="relative flex h-full w-full flex-col bg-ivory shadow-drawer outline-none sm:w-[560px]"
      >
        {children}
      </div>
    </div>
  );
}
