import type { ApplicantView } from "./types";

export type SortKey = "newest" | "score";

export type ApplicantFilters = {
  search?: string;
  didTask?: boolean;
  audioOnly?: boolean;
  appliedBefore?: boolean;
  /** Minimum score (1..5). Unscored applicants never match. */
  minScore?: number | null;
  /** Inclusive dates as YYYY-MM-DD, compared in UTC against createdAt. */
  from?: string | null;
  to?: string | null;
};

export const EMPTY_FILTERS: ApplicantFilters = {};

const digits = (s: string) => s.replace(/\D/g, "");

export function matchesSearch(a: ApplicantView, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = `${a.firstName} ${a.lastName}`.toLowerCase();
  if (name.includes(q) || a.email.toLowerCase().includes(q)) return true;
  const qd = digits(q);
  return qd.length > 0 && digits(a.phoneE164).includes(qd);
}

function inDateRange(createdAt: string, from?: string | null, to?: string | null): boolean {
  const day = createdAt.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export function filterApplicants(list: ApplicantView[], f: ApplicantFilters): ApplicantView[] {
  return list.filter((a) => {
    if (a.isTest) return false;
    if (!matchesSearch(a, f.search ?? "")) return false;
    if (f.didTask && !a.didTask) return false;
    if (f.audioOnly && !a.audioOnly) return false;
    if (f.appliedBefore && !a.appliedBefore) return false;
    if (f.minScore && (a.score === null || a.score < f.minScore)) return false;
    return inDateRange(a.createdAt, f.from, f.to);
  });
}

/** Newest first (default) or highest score first, newest first among equal scores. Returns a new array. */
export function sortApplicants(list: ApplicantView[], key: SortKey): ApplicantView[] {
  const byNewest = (a: ApplicantView, b: ApplicantView) => b.createdAt.localeCompare(a.createdAt);
  const copy = [...list];
  if (key === "score") return copy.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || byNewest(a, b));
  return copy.sort(byNewest);
}

export function hasActiveFilters(f: ApplicantFilters): boolean {
  return Boolean(f.search?.trim() || f.didTask || f.audioOnly || f.appliedBefore || f.minScore || f.from || f.to);
}
