"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { QuestionDef, StageDef } from "@/features/projects";
import { localTime, type ApplicantView } from "@/features/applicants";
import { cn } from "@/shared/cn";
import { answerColumnTitle, answerText } from "../logic/card-text";
import { nextTableSort, type TableSort, type TableSortKey } from "../logic/table-sort";
import { CountryChip } from "./country-chip";
import { ScoreStars } from "./score-stars";
import { StageBadge } from "./stage-badge";

const appliedFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

type Props = {
  applicants: ApplicantView[];
  stages: StageDef[];
  question: QuestionDef | null;
  now: Date;
  sort: TableSort;
  onSort: (s: TableSort) => void;
  onOpen: (id: string) => void;
};

function SortHeader({ label, sortKey, sort, onSort }: { label: string; sortKey: TableSortKey; sort: TableSort; onSort: (s: TableSort) => void }) {
  const on = sort.key === sortKey;
  const Icon = sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-0 text-left">
      <button
        type="button"
        onClick={() => onSort(nextTableSort(sort, sortKey))}
        className={cn(
          "inline-flex h-[52px] items-center gap-1 text-xs font-extrabold uppercase tracking-[0.08em] hover:text-charcoal focus-visible:outline-2 focus-visible:outline-charcoal",
          on ? "text-charcoal" : "text-subtle",
        )}
      >
        {label}
        {on && <Icon className="size-3" aria-hidden />}
      </button>
    </th>
  );
}

/** D07. Everyone on the board in one list. Click a header to sort, click a row to open the drawer. */
export function ApplicantsTable({ applicants, stages, question, now, sort, onSort, onOpen }: Props) {
  const stageOf = (id: string | null) => stages.find((s) => s.id === id);
  const header = (label: string, key: TableSortKey) => <SortHeader label={label} sortKey={key} sort={sort} onSort={onSort} />;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            {header("Name", "name")}
            {header("Stage", "stage")}
            {header(answerColumnTitle(question), "answer")}
            {header("Task", "task")}
            {header("Score", "score")}
            {header("Local time", "localTime")}
            {header("Applied", "applied")}
          </tr>
        </thead>
        <tbody>
          {applicants.map((a) => (
            <tr key={a.id} onClick={() => onOpen(a.id)} className="cursor-pointer border-b border-line last:border-b-0 hover:bg-ivory">
              <td className="px-4 py-3">
                <button type="button" data-card-id={a.id} className="flex items-center gap-2 rounded-md text-left font-bold text-charcoal focus-visible:outline-2 focus-visible:outline-charcoal">
                  <span className="max-w-[240px] truncate">{a.firstName} {a.lastName}</span>
                  <CountryChip code={a.phoneCountry} />
                </button>
              </td>
              <td className="px-4 py-3">
                <StageBadge stage={stageOf(a.stageId)} />
              </td>
              <td className="px-4 py-3 text-muted">{answerText(a, question) || "None"}</td>
              <td className="px-4 py-3 text-charcoal">{a.didTask ? "Yes" : "No"}</td>
              <td className="px-4 py-3">{a.score !== null ? <ScoreStars score={a.score} /> : <span className="text-placeholder">None</span>}</td>
              <td className="px-4 py-3 text-charcoal" suppressHydrationWarning>
                {localTime(a.timezone, now)}
              </td>
              <td className="px-4 py-3 text-charcoal">{appliedFmt.format(new Date(a.createdAt))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
