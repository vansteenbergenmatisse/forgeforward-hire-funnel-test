"use client";

import type { KeyboardEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { QuestionDef, StageDef } from "@/features/projects";
import type { ApplicantView } from "@/features/applicants";
import { cn } from "@/shared/cn";
import { cardDragId } from "../logic/drag-end";
import { ApplicantCardBody } from "./applicant-card-body";

export const CARD_CLASS =
  "relative block w-full rounded-lg border border-line bg-white p-2.5 text-left shadow-[0_1px_2px_rgb(14_18_32/0.05)] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-charcoal";

type Props = { applicant: ApplicantView; stage: StageDef; stages: StageDef[]; question: QuestionDef | null; now: Date; onOpen: (id: string, play?: boolean) => void };

/** One board card. Click or Enter opens the drawer, Space picks it up for keyboard moves, a pointer drag moves it. */
export function DraggableCard({ applicant, stage, stages, question, now, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: cardDragId(applicant.id) });
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    listeners?.onKeyDown?.(e);
    if (e.key === "Enter" && !e.defaultPrevented) onOpen(applicant.id);
  };
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onKeyDown={onKeyDown}
      onClick={(e) => onOpen(applicant.id, (e.target as HTMLElement).closest("[data-thumb]") !== null)}
      data-card-id={applicant.id}
      aria-label={`${applicant.firstName} ${applicant.lastName}, ${stage.name}`}
      className={cn(CARD_CLASS, "cursor-grab touch-manipulation hover:shadow-lift", isDragging && "opacity-40")}
    >
      <ApplicantCardBody applicant={applicant} stages={stages} question={question} now={now} />
    </div>
  );
}
