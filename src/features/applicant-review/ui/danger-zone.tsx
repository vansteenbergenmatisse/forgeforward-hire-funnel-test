"use client";

import { useId, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { Section } from "./section";

export const DELETE_WORD = "DELETE";

export function DangerZone({ onDelete }: { onDelete: () => void }) {
  const [text, setText] = useState("");
  const id = useId();
  const ready = text === DELETE_WORD;
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
            className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-white px-3 text-sm focus:border-charcoal focus:outline-none"
          />
          <Button variant="danger" icon={<Trash2 className="size-4" aria-hidden />} disabled={!ready} onClick={onDelete}>
            Delete applicant
          </Button>
        </div>
      </div>
    </Section>
  );
}
