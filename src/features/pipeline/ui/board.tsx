"use client";

import { useId, useMemo, useState } from "react";
import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import type { QuestionDef, StageDef } from "@/features/projects";
import { warnOnMoveOutOfPositive, type ApplicantActions, type ApplicantView } from "@/features/applicants";
import { groupByStage } from "../logic/group-columns";
import { CARD_PREFIX, resolveDrop } from "../logic/drag-end";
import { ApplicantCardBody } from "./applicant-card-body";
import { BoardColumn } from "./board-column";
import { buildAnnouncements, coordinateGetter, detectColumn, screenReaderInstructions } from "./board-dnd";
import { CARD_CLASS } from "./draggable-card";
import { MoveWarningDialog, type PendingMove } from "./move-warning-dialog";

type Props = {
  /** Already filtered and sorted. */
  applicants: ApplicantView[];
  /** All cards of the project, used to resolve drops while filters hide some. */
  allApplicants: ApplicantView[];
  stages: StageDef[];
  question: QuestionDef | null;
  now: Date;
  filtered: boolean;
  actions: ApplicantActions;
  onOpen: (id: string, play?: boolean) => void;
};

export function Board({ applicants, allApplicants, stages, question, now, filtered, actions, onOpen }: Props) {
  const dndId = useId();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A short press starts a touch drag, so a quick swipe still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter, keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] } }),
  );
  const columns = useMemo(() => groupByStage(applicants, stages), [applicants, stages]);
  const announcements = useMemo(() => buildAnnouncements(allApplicants, stages), [allApplicants, stages]);
  const active = activeId ? allApplicants.find((a) => `${CARD_PREFIX}${a.id}` === activeId) : undefined;

  const toggle = (stageId: string) =>
    setExpanded((cur) => {
      const next = new Set(cur);
      if (!next.delete(stageId)) next.add(stageId);
      return next;
    });

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const drop = resolveDrop(String(e.active.id), e.over ? String(e.over.id) : null, allApplicants, stages);
    if (!drop) return;
    const a = allApplicants.find((x) => x.id === drop.applicantId);
    if (!a) return;
    const days = warnOnMoveOutOfPositive(a, drop.toStageId, stages);
    if (days === null) return actions.moveToStage(a.id, drop.toStageId);
    setPending({
      applicantId: a.id,
      name: `${a.firstName} ${a.lastName}`,
      fromName: stages.find((s) => s.id === a.stageId)?.name ?? "this stage",
      toName: stages.find((s) => s.id === drop.toStageId)?.name ?? "the new stage",
      toStageId: drop.toStageId,
      days,
    });
  }

  return (
    <>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={detectColumn}
        accessibility={{ announcements, screenReaderInstructions }}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex items-start gap-3 overflow-x-auto pb-4" role="group" aria-label="Pipeline board">
          {columns.map(({ stage, cards }) => (
            <BoardColumn
              key={stage.id}
              stage={stage}
              cards={cards}
              stages={stages}
              question={question}
              now={now}
              expanded={expanded.has(stage.id)}
              dragging={activeId !== null}
              filtered={filtered}
              onToggle={toggle}
              onOpen={onOpen}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {active ? (
            <div className={`${CARD_CLASS} w-[224px] rotate-2 cursor-grabbing shadow-lift`}>
              <ApplicantCardBody applicant={active} stages={stages} question={question} now={now} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <MoveWarningDialog
        pending={pending}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) actions.moveToStage(pending.applicantId, pending.toStageId);
          setPending(null);
        }}
      />
    </>
  );
}
