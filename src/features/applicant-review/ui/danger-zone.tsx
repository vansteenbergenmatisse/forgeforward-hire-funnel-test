"use client";

import { useId, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { Section } from "./section";

export const DELETE_WORD = "DELETE";

/** `onDelete` resolves null when the applicant is gone, or the reason it failed. */
export function DangerZone({ onDelete }: { onDelete: () => Promise<string | null> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const ready = text === DELETE_WORD && !busy;

  async function confirm() {
    setBusy(true);
    setError(null);
    const failure = await onDelete();
    setBusy(false);
    if (failure) setError(failure);
  }
  return (
    <Section title="Danger zone">
      <div className="rounded-xl border border-signal/30 bg-signal-tint/50 p-4">
        <p className="text-base font-bold text-signal-deep">Delete applicant</p>
        <p className="mt-1 text-sm text-muted">Type {DELETE_WORD} to confirm. This removes the video, messages and timeline too. It cannot be undone.</p>
        <label htmlFor={id} className="sr-only">Type {DELETE_WORD} to confirm</label>
        <div className="mt-3 flex gap-2">
          <input
            id={id}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
            placeholder={DELETE_WORD}
            className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-white px-3 text-sm pointer-coarse:text-base focus:border-charcoal focus:outline-none"
          />
          <Button variant="danger" icon={<Trash2 className="size-4" aria-hidden />} disabled={!ready} onClick={confirm}>
            {busy ? "Deleting..." : "Delete applicant"}
          </Button>
        </div>
        <p role="alert" className={error ? "mt-3 text-sm font-semibold text-signal-deep" : "sr-only"}>
          {error}
        </p>
      </div>
    </Section>
  );
}
