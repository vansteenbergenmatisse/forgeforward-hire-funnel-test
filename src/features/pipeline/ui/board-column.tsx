"use client";

import { useDroppable } from "@dnd-kit/core";
import { ShieldCheck } from "lucide-react";
import type { QuestionDef, StageDef } from "@/features/projects";
import type { ApplicantView } from "@/features/applicants";
import { toneDot } from "@/components/ui";
import { cn } from "@/shared/cn";
import { COLLAPSED_LIMIT, visibleCards } from "../logic/collapse";
import { stageDropId } from "../logic/drag-end";
import { DraggableCard } from "./draggable-card";

type Props = {
  stage: StageDef;
  cards: ApplicantView[];
  stages: StageDef[];
  question: QuestionDef | null;
  now: Date;
  expanded: boolean;
  dragging: boolean;
  filtered: boolean;
  onToggle: (stageId: string) => void;
  onOpen: (id: string, play?: boolean) => void;
};

export function BoardColumn({ stage, cards, stages, question, now, expanded, dragging, filtered, onToggle, onOpen }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stageDropId(stage.id) });
  const { visible, hidden } = visibleCards(cards, expanded);
  return (
    <section
      ref={setNodeRef}
      aria-label={`${stage.name}, ${cards.length} ${cards.length === 1 ? "applicant" : "applicants"}`}
      className={cn("flex w-[244px] flex-none flex-col gap-2 rounded-xl bg-sand p-2.5 transition-shadow", isOver && "bg-blue-tint ring-2 ring-blue", dragging && !isOver && "ring-1 ring-line-strong")}
    >
      <div role="heading" aria-level={2} className="flex items-center gap-2 px-1 pb-1 pt-0.5 text-[13.5px] font-extrabold text-charcoal">
        <span className={cn("size-[9px] rounded-full", toneDot[stage.color])} aria-hidden />
        {stage.name}
        {stage.isPositive && <ShieldCheck className="size-3.5 text-subtle" aria-label="Videos in this stage are kept" role="img" />}
        <span className="ml-auto text-[12.5px] font-bold text-muted">{cards.length}</span>
      </div>
      {cards.length === 0 && (
        <p className={cn("rounded-lg border border-dashed px-3 py-5 text-center text-[12.5px] font-semibold", isOver ? "border-blue text-blue" : "border-line-strong text-subtle")}>
          {dragging ? "Drop here" : filtered ? "No matches in this stage" : "No applicants yet"}
        </p>
      )}
      {visible.map((a) => (
        <DraggableCard key={a.id} applicant={a} stage={stage} stages={stages} question={question} now={now} onOpen={onOpen} />
      ))}
      {(hidden > 0 || (expanded && cards.length > COLLAPSED_LIMIT)) && (
        <button
          type="button"
          onClick={() => onToggle(stage.id)}
          aria-expanded={expanded}
          className="mt-0.5 rounded-md py-1.5 text-center text-[12.5px] font-semibold text-muted hover:bg-white hover:text-charcoal focus-visible:outline-2 focus-visible:outline-charcoal"
        >
          {expanded ? "Show less" : `+ ${hidden} more`}
        </button>
      )}
    </section>
  );
}
