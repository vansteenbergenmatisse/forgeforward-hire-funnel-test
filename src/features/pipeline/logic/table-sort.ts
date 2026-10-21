import type { QuestionDef, StageDef } from "@/features/projects";
import type { ApplicantView } from "@/features/applicants";
import { answerText } from "./card-text";

export type TableSortKey = "name" | "stage" | "answer" | "task" | "score" | "localTime" | "applied";
export type TableSort = { key: TableSortKey; dir: "asc" | "desc" };

export const DEFAULT_TABLE_SORT: TableSort = { key: "applied", dir: "desc" };

/** Clicking a header sorts ascending, clicking it again flips the direction. Applied and score start descending. */
export function nextTableSort(current: TableSort, key: TableSortKey): TableSort {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: key === "applied" || key === "score" ? "desc" : "asc" };
}

export function minutesOfDay(timezone: string, now: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now);
    const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    return (n("hour") % 24) * 60 + n("minute");
  } catch {
    return 0;
  }
}

type Ctx = { stages: StageDef[]; question: QuestionDef | null; now: Date };

function sortValue(a: ApplicantView, key: TableSortKey, ctx: Ctx): string | number {
  switch (key) {
    case "name":
      return `${a.firstName} ${a.lastName}`.toLowerCase();
    case "stage":
      return a.stageId === null ? ctx.stages.length : ctx.stages.findIndex((s) => s.id === a.stageId);
    case "answer": {
      const text = answerText(a, ctx.question);
      const options = ctx.question?.options ?? [];
      const i = options.indexOf(text);
      return i >= 0 ? i : text.toLowerCase();
    }
    case "task":
      return a.didTask ? 1 : 0;
    case "score":
      return a.score ?? 0;
    case "localTime":
      return minutesOfDay(a.timezone, ctx.now);
    case "applied":
      return a.createdAt;
  }
}

/** Returns a new array. Ties keep newest first so the order is stable. */
export function sortTableRows(rows: ApplicantView[], sort: TableSort, ctx: Ctx): ApplicantView[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = sortValue(a, sort.key, ctx);
    const vb = sortValue(b, sort.key, ctx);
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "en", { numeric: true });
    return cmp * sign || b.createdAt.localeCompare(a.createdAt);
  });
}
