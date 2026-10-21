"use client";

import { useEffect, useMemo, useState } from "react";
import { videoDeletesInDays, retentionBadgeText, useApplicants } from "@/features/applicants";
import { useProjects } from "@/features/project-admin";
import { SendMessagePanel } from "@/features/messaging";
import type { Channel } from "@/features/projects";
import type { ApplicantDrawerProps } from "../types";
import { AnswersBlock } from "./answers-block";
import { BookingBlock } from "./booking-block";
import { ContactBlock } from "./contact-block";
import { DangerZone } from "./danger-zone";
import { DrawerHeader } from "./drawer-header";
import { DrawerShell } from "./drawer-shell";
import { MessagesBlock } from "./messages-block";
import { ApplicantNotFound } from "./not-found";
import { Player } from "./player";
import { ScoreNotes } from "./score-notes";
import { TaskBlock } from "./task-block";
import { TimelineBlock } from "./timeline-block";

export function ApplicantDrawer({ applicantId, projectSlug, onClose, initialSendChannel, autoPlay }: ApplicantDrawerProps) {
  const { applicants, actions } = useApplicants();
  const { state } = useProjects();
  const [sendChannel, setSendChannel] = useState<Channel | null>(initialSendChannel ?? null);

  const a = applicants.find((x) => x.id === applicantId);
  const record = state.projects.find((p) => p.def.slug === (a?.projectSlug ?? projectSlug));
  const stages = useMemo(() => record?.stages ?? [], [record]);
  const stageName = (id: string | null) => stages.find((s) => s.id === id)?.name ?? "Did not finish";

  const unread = a?.unreadReply ?? false;
  useEffect(() => {
    if (a && unread) actions.markRead(a.id);
  }, [a, unread, actions]);

  const backToApplicant = () => {
    setSendChannel(null);
    // The send panel's focused button unmounts, so hand focus back to the dialog.
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="dialog"]')?.focus());
  };

  const keepDays = a ? videoDeletesInDays(a, stages, new Date()) : null;

  return (
    <DrawerShell onClose={sendChannel ? backToApplicant : onClose} labelledBy={sendChannel ? "send-title" : "drawer-title"}>
      {!a ? (
        <ApplicantNotFound onClose={onClose} />
      ) : sendChannel && record ? (
        <SendMessagePanel
          applicant={a}
          project={{ name: record.def.name, calLink: record.def.calLink }}
          templates={record.templates}
          channel={sendChannel}
          actions={actions}
          onBack={backToApplicant}
        />
      ) : (
        <>
          <DrawerHeader a={a} stages={stages} onMove={(id) => (a.stageId === null ? actions.placeOnBoard(a.id, id) : actions.moveToStage(a.id, id))} onClose={onClose} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-3 px-6 py-5">
              <Player media={a.media} name={a.firstName} autoPlay={autoPlay} />
              {a.media && !a.media.deletedAt && (
                <p className="text-[13px] text-muted">
                  {a.retakeUsed && "Retake used. "}
                  {keepDays !== null ? retentionBadgeText(keepDays) + "." : "Video deletes only if not in a kept stage after 30 days."}
                </p>
              )}
            </div>
            <MessagesBlock a={a} onSend={setSendChannel} />
            <ContactBlock a={a} />
            <AnswersBlock a={a} />
            <TaskBlock a={a} />
            <ScoreNotes key={a.id} a={a} actions={actions} />
            <BookingBlock a={a} />
            <TimelineBlock a={a} stageName={stageName} />
            <DangerZone
              onDelete={() => {
                actions.remove(a.id);
                onClose();
              }}
            />
          </div>
        </>
      )}
    </DrawerShell>
  );
}
