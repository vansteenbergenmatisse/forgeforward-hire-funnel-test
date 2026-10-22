"use client";

import { ArrowRight } from "lucide-react";
import type { QuestionDef, StageDef } from "@/features/projects";
import type { ApplicantActions, ApplicantView } from "@/features/applicants";
import { Badge } from "@/components/ui";
import { answerColumnTitle, answerText, progressLabel } from "../logic/card-text";
import { CountryChip } from "./country-chip";
import { FilterPopover } from "./filter-popover";
import { Thumbnail } from "./thumbnail";

const startedFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const th = "px-4 py-3 text-left text-xs font-extrabold uppercase tracking-[0.08em] text-subtle";

function StagePicker({ applicant, stages, actions }: { applicant: ApplicantView; stages: StageDef[]; actions: ApplicantActions }) {
  return (
    <FilterPopover
      label="Move to board"
      active={false}
      icon={<ArrowRight className="size-4" aria-hidden />}
      buttonClassName="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-white px-3.5 text-sm font-bold text-charcoal hover:bg-sand focus-visible:outline-2 focus-visible:outline-charcoal"
      panelClassName="left-auto right-0 w-[200px] p-1.5"
    >
      {(close) => (
        <ul aria-label={`Place ${applicant.firstName} in a stage`}>
          {stages.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  actions.placeOnBoard(applicant.id, s.id);
                  close();
                }}
                className="flex h-9 w-full items-center rounded-md px-2.5 text-left text-sm font-semibold text-charcoal hover:bg-sand focus-visible:outline-2 focus-visible:outline-charcoal"
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </FilterPopover>
  );
}

type Props = {
  applicants: ApplicantView[];
  stages: StageDef[];
  question: QuestionDef | null;
  actions: ApplicantActions;
  onOpen: (id: string) => void;
};

/** D06. People who never finished, newest first. Matt can put one on the board at any stage. */
export function DnfList({ applicants, stages, question, actions, onOpen }: Props) {
  return (
    <>
      <p className="mb-4 text-sm text-muted">People who sent the form but did not finish. Newest first. Their videos follow the same 30 day rule.</p>
      <div className="rounded-xl border border-line bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={th}>Name</th>
              <th scope="col" className={th}>How far they got</th>
              <th scope="col" className={th}>{answerColumnTitle(question)}</th>
              <th scope="col" className={th}>Started</th>
              <th scope="col" className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((a) => {
              const how = progressLabel(a);
              return (
                <tr key={a.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-2">
                    <button type="button" data-card-id={a.id} onClick={() => onOpen(a.id)} className="flex items-center gap-3 rounded-md text-left font-bold text-charcoal focus-visible:outline-2 focus-visible:outline-charcoal">
                      <Thumbnail applicant={a} size="row" />
                      <span className="max-w-[240px] truncate">{a.firstName} {a.lastName}</span>
                      <CountryChip code={a.phoneCountry} />
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={how === "Form only" ? "gray" : "blue"}>{how}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted">{answerText(a, question) || "None"}</td>
                  <td className="px-4 py-2 text-muted" suppressHydrationWarning>
                    {startedFmt.format(new Date(a.createdAt))}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <StagePicker applicant={a} stages={stages} actions={actions} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
