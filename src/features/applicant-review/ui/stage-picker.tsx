"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";
import { warnOnMoveOutOfPositive, type ApplicantView } from "@/features/applicants";
import type { StageDef } from "@/features/projects";

type Props = { a: ApplicantView; stages: StageDef[]; onMove: (stageId: string) => void };

export function StagePicker({ a, stages, onMove }: Props) {
  const [pending, setPending] = useState<{ stageId: string; days: number } | null>(null);

  function choose(stageId: string) {
    if (stageId === a.stageId) return;
    const days = warnOnMoveOutOfPositive(a, stageId, stages);
    if (days === null) return onMove(stageId);
    setPending({ stageId, days });
  }

  const target = pending && stages.find((s) => s.id === pending.stageId);
  return (
    <div className="min-w-0">
      <label htmlFor="drawer-stage" className="sr-only">Stage</label>
      <select
        id="drawer-stage"
        value={a.stageId ?? ""}
        onChange={(e) => choose(e.target.value)}
        className="h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm pointer-coarse:text-base font-bold text-charcoal focus:border-charcoal focus:outline-none"
      >
        {a.stageId === null && <option value="" disabled>Did not finish</option>}
        {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {pending && target && (
        <div role="alert" className="mt-2 rounded-lg border border-amber-dot/50 bg-amber-tint p-3 text-sm text-amber">
          <p className="flex items-start gap-2 font-bold">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            This applicant is deleted {pending.days} {pending.days === 1 ? "day" : "days"} after the move.
          </p>
          <p className="mt-1 pl-6">{target.name} is not a kept stage. All data and files are removed.</p>
          <div className="mt-2.5 flex gap-2 pl-6">
            <Button size="sm" variant="dark" onClick={() => { onMove(pending.stageId); setPending(null); }}>Move anyway</Button>
            <Button size="sm" variant="secondary" onClick={() => setPending(null)}>Keep in place</Button>
          </div>
        </div>
      )}
    </div>
  );
}
