import type { ApplicantView } from "./types";

export type SortKey = "newest" | "score";

export type ApplicantFilters = {
  search?: string;
  didTask?: boolean;
  audioOnly?: boolean;
  appliedBefore?: boolean;
  /** Minimum score (1..5). Unscored applicants never match. */
  minScore?: number | null;
  /** Inclusive days as YYYY-MM-DD from the date picker. They are days in the admin's own time zone. */
  from?: string | null;
  to?: string | null;
};

export const EMPTY_FILTERS: ApplicantFilters = {};

const digits = (s: string) => s.replace(/\D/g, "");
const MIN_PHONE_DIGITS = 3;

export function matchesSearch(a: ApplicantView, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = `${a.firstName} ${a.lastName}`.toLowerCase();
  if (name.includes(q) || a.email.toLowerCase().includes(q)) return true;
  // Digits only match phone numbers when the query looks like a phone number, so "mike5" or "5" do not list strangers.
  if (/[a-z]/i.test(q)) return false;
  const qd = digits(q);
  return qd.length >= MIN_PHONE_DIGITS && digits(a.phoneE164).includes(qd);
}

/** Start of a YYYY-MM-DD day in the browser's time zone, or null for a bad value. */
function localDayStart(ymd: string, plusDays = 0): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + plusDays).getTime();
}

function inDateRange(createdAt: string, from?: string | null, to?: string | null): boolean {
  const t = new Date(createdAt).getTime();
  const start = from ? localDayStart(from) : null;
  const endExclusive = to ? localDayStart(to, 1) : null;
  if (start !== null && t < start) return false;
  if (endExclusive !== null && t >= endExclusive) return false;
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
