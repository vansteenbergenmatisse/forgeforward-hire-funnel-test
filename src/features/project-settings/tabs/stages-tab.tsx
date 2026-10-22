"use client";

import { useState } from "react";
import { AlertCircle, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import type { StageDef, StageRole } from "@/features/projects";
import { moveById } from "../logic/reorder";
import { stopKeepingWarning } from "../logic/retention-warning";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { ROLE_LABEL, addStage, assignRole, checkDeleteStage, deleteStage } from "../logic/stages";
import { useStageUsage } from "../stage-usage";
import type { SettingsApi } from "../use-settings";
import { Card } from "../ui/card";
import { DeleteStageDialog } from "../ui/delete-stage-dialog";
import { SortableList } from "../ui/sortable-list";
import { STAGE_GRID, StageRow } from "../ui/stage-row";

type Notice = { tone: "info" | "error"; text: string } | null;

export function StagesTab({ api }: { api: SettingsApi }) {
  const { stages } = api.data;
  const usage = useStageUsage(api.slug);
  const [notice, setNotice] = useState<Notice>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<StageDef | null>(null);
  const [unkeeping, setUnkeeping] = useState<StageDef | null>(null);

  const setStages = (next: StageDef[]) => api.update((d) => ({ ...d, stages: next }));
  const patch = (id: string, p: Partial<StageDef>) => setStages(stages.map((s) => (s.id === id ? { ...s, ...p } : s)));

  // Turning "Keep videos" off puts every card's video on the 30 day clock, so a stage with cards asks first.
  function onPositive(stage: StageDef, keep: boolean) {
    if (!keep && stopKeepingWarning(stage, usage.countCardsInStage(stage.id))) return setUnkeeping(stage);
    patch(stage.id, { isPositive: keep });
  }

  function onRole(stage: StageDef, role: StageRole) {
    if (role === null) return;
    const before = stages;
    const next = assignRole(before, stage.id, role);
    setStages(next);
    const lost = before.find((s) => s.role === role && s.id !== stage.id);
    const swapped = lost ? next.find((s) => s.id === lost.id) : undefined;
    setNotice({
      tone: "info",
      text: `${stage.name} now holds "${ROLE_LABEL[role]}".${lost ? (swapped?.role ? ` ${lost.name} took "${ROLE_LABEL[swapped.role]}" so every role stays on one stage.` : ` ${lost.name} has no role now.`) : ""}`,
    });
  }

  function onDelete(stage: StageDef) {
    const cards = usage.countCardsInStage(stage.id);
    const check = checkDeleteStage(stages, stage.id, cards);
    if (!check.ok) return setNotice({ tone: "error", text: check.message });
    setNotice(null);
    setDeleting(stage);
  }

  function confirmDelete(targetId: string | undefined) {
    if (!deleting) return;
    const cards = usage.countCardsInStage(deleting.id);
    const next = deleteStage(stages, deleting.id, cards, targetId);
    if (!next) return;
    if (cards > 0 && targetId) usage.moveCards(deleting.id, targetId);
    setStages(next);
    const target = stages.find((s) => s.id === targetId);
    setNotice({ tone: "info", text: cards > 0 && target ? `Deleted ${deleting.name}. Moved ${cards} ${cards === 1 ? "card" : "cards"} to ${target.name}.` : `Deleted ${deleting.name}.` });
    setDeleting(null);
  }

  function add() {
    const id = crypto.randomUUID();
    setStages(addStage(stages, id));
    setFocusId(id);
    setNotice(null);
  }

  return (
    <>
      <Card className="p-0" id="stages">
        <div className="overflow-x-auto">
          <div className="min-w-[860px] px-5 pb-1 pt-4">
            <div className={`${STAGE_GRID} pb-2 text-[12px] font-extrabold uppercase tracking-[0.1em] text-subtle`} aria-hidden>
              <span />
              <span />
              <span>Stage</span>
              <span>Role</span>
              <span>Positive</span>
              <span />
            </div>
            <SortableList ids={stages.map((s) => s.id)} label="Stages" onMove={(a, o) => setStages(moveById(stages, a, o))}>
              {stages.map((s) => (
                <StageRow
                  key={s.id}
                  stage={s}
                  stages={stages}
                  autoFocus={focusId === s.id}
                  onRename={(name) => patch(s.id, { name })}
                  onRecolor={(color) => patch(s.id, { color })}
                  onPositive={(keep) => onPositive(s, keep)}
                  onRole={(r) => onRole(s, r)}
                  onDelete={() => onDelete(s)}
                />
              ))}
            </SortableList>
          </div>
        </div>
        <div className="border-t border-line px-5 py-3">
          <Button variant="secondary" icon={<Plus className="size-4" />} onClick={add}>
            Add stage
          </Button>
        </div>
      </Card>
      <div aria-live="polite" className="mt-3 min-h-6">
        {notice && (
          <p role={notice.tone === "error" ? "alert" : undefined} className={`flex items-start gap-2 text-[14px] font-semibold ${notice.tone === "error" ? "text-signal-deep" : "text-charcoal"}`}>
            {notice.tone === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />}
            {notice.text}
          </p>
        )}
      </div>
      <p className="mt-1 max-w-3xl text-[14px] leading-snug text-muted">
        Videos in a kept stage never auto-delete. A stage with a role cannot be deleted until you move the role. Deleting a stage with cards asks where to move them first.
      </p>
      <ConfirmDialog
        open={!!unkeeping}
        title={unkeeping ? `Stop keeping videos in ${unkeeping.name}?` : "Stop keeping videos?"}
        confirmLabel="Stop keeping videos"
        tone="primary"
        onCancel={() => setUnkeeping(null)}
        onConfirm={() => {
          if (unkeeping) patch(unkeeping.id, { isPositive: false });
          setUnkeeping(null);
        }}
      >
        <p>{unkeeping ? stopKeepingWarning(unkeeping, usage.countCardsInStage(unkeeping.id)) : ""}</p>
      </ConfirmDialog>
      <DeleteStageDialog
        stage={deleting}
        stages={stages}
        cards={deleting ? usage.countCardsInStage(deleting.id) : 0}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
