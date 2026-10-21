"use client";

import { useEffect, useRef } from "react";
import { MainButton, TextButton } from "@/components/funnel";

/** A15: native dialog. Bottom sheet on phones, centered card from `md`. */
export function SkipDialog({ open, busy, onStay, onSkip }: { open: boolean; busy: boolean; onStay: () => void; onSkip: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="skip-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onStay();
      }}
      className="m-0 mt-auto w-full max-w-none rounded-t-3xl bg-white px-5 pb-[30px] pt-[26px] text-center text-charcoal shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)] backdrop:bg-charcoal/55 md:m-auto md:w-[460px] md:rounded-[20px] md:px-8 md:pb-7 md:pt-8"
    >
      <h2 id="skip-title" className="text-[32px] leading-[0.98]">
        Skip the task?
      </h2>
      <p className="mt-2 text-base leading-normal text-muted md:text-[17px]">People who do it stand out.</p>
      <div className="mt-[22px] flex flex-col gap-1.5">
        <MainButton onClick={onStay} disabled={busy}>
          Do the task
        </MainButton>
        <TextButton onClick={onSkip} disabled={busy}>
          {busy ? "Saving" : "Skip task"}
        </TextButton>
      </div>
    </dialog>
  );
}
