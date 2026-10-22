"use client";

import { useEffect, useId, useRef } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui";

export type PendingMove = { applicantId: string; name: string; fromName: string; toName: string; toStageId: string; days: number };

/** Native dialog. Shown before a card older than 25 days leaves a positive stage. Escape or Cancel keeps the card where it is. */
export function MoveWarningDialog({ pending, onConfirm, onCancel }: { pending: PendingMove | null; onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (pending && !d.open) d.showModal();
    if (!pending && d.open) d.close();
  }, [pending]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-xl border border-line bg-white p-0 text-charcoal shadow-lift backdrop:bg-charcoal/50"
    >
      {pending && (
        <div className="p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-tint text-amber">
              <TriangleAlert className="size-5" aria-hidden />
            </span>
            <div>
              <p id={titleId} role="heading" aria-level={2} className="text-lg font-extrabold">
                Move {pending.name} out of {pending.fromName}?
              </p>
              <p className="mt-1.5 text-sm text-muted">
                This applicant is deleted {pending.days} {pending.days === 1 ? "day" : "days"} after the move, with all their data and files. Cards in {pending.fromName} are kept. Cards in {pending.toName} are not.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={onCancel} autoFocus>
              Keep in {pending.fromName}
            </Button>
            <Button variant="dark" onClick={onConfirm}>
              Move to {pending.toName}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
