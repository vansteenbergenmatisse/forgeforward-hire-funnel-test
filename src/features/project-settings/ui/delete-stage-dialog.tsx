"use client";

import { useState } from "react";
import type { StageDef } from "@/features/projects";
import { moveOutOfKeptWarning } from "../logic/retention-warning";
import { validDeleteTargets } from "../logic/stages";
import { ConfirmDialog } from "./confirm-dialog";
import { DenseSelect } from "./dense";

/** Delete confirmation. When cards sit in the stage it also asks where to move them. */
export function DeleteStageDialog({
  stage,
  stages,
  cards,
  onCancel,
  onConfirm,
}: {
  stage: StageDef | null;
  stages: StageDef[];
  cards: number;
  onCancel: () => void;
  onConfirm: (targetId: string | undefined) => void;
}) {
  const targets = stage ? validDeleteTargets(stages, stage.id) : [];
  const [target, setTarget] = useState<string>("");
  const effective = target && targets.some((t) => t.id === target) ? target : (targets[0]?.id ?? "");
  const videoWarning = stage && cards > 0 ? moveOutOfKeptWarning(stage, targets.find((t) => t.id === effective), cards) : null;

  return (
    <ConfirmDialog
      open={!!stage}
      title={stage ? `Delete ${stage.name}?` : "Delete stage"}
      confirmLabel={cards > 0 ? `Move ${cards} ${cards === 1 ? "card" : "cards"} and delete` : "Delete stage"}
      tone="primary"
      onCancel={() => {
        setTarget("");
        onCancel();
      }}
      onConfirm={() => {
        onConfirm(cards > 0 ? effective : undefined);
        setTarget("");
      }}
    >
      {cards > 0 ? (
        <div className="flex flex-col gap-3">
          <p>
            {cards} {cards === 1 ? "applicant card sits" : "applicant cards sit"} in this stage. Choose where they go first.
          </p>
          <DenseSelect label="Move cards to" value={effective} onChange={(e) => setTarget(e.target.value)}>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </DenseSelect>
          {videoWarning && (
            <p role="alert" className="rounded-lg bg-amber-tint px-3 py-2 text-[13.5px] font-semibold text-amber">
              {videoWarning}
            </p>
          )}
        </div>
      ) : (
        <p>No cards sit in this stage. This cannot be undone.</p>
      )}
    </ConfirmDialog>
  );
}
