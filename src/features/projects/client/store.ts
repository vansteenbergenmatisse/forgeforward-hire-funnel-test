import type { ProjectBundle, ProjectRecordDto } from "../types";
import { adminFetch } from "./api";

// One client cache of every project's settings, stages, questions and templates.
// The Projects home, the board and the Settings screens all read it, so an edit shows everywhere.
// The database is the source of truth. `baseline` is what the server last confirmed for a project.

export type RecordMeta = { savedAt: number | null; error: string | null };
export type RecordsState = {
  status: "idle" | "loading" | "ready" | "error";
  records: ProjectRecordDto[];
  error: string | null;
  meta: Record<string, RecordMeta>;
};

export const EMPTY_RECORDS: RecordsState = { status: "idle", records: [], error: null, meta: {} };
const NO_META: RecordMeta = { savedAt: null, error: null };

let state: RecordsState = EMPTY_RECORDS;
let loading: Promise<void> | null = null;
const baselines = new Map<string, ProjectBundle>();
const aliases = new Map<string, string>();
const listeners = new Set<() => void>();

function set(next: RecordsState) {
  state = next;
  listeners.forEach((l) => l());
}

export const getRecordsState = () => state;

export function subscribeRecords(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

export const metaFor = (s: RecordsState, slug: string): RecordMeta => s.meta[slug] ?? NO_META;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const bundleOf = ({ def, questions, stages, templates }: ProjectRecordDto): ProjectBundle => ({ def, questions, stages, templates });

/** Loads every project once. Pass `force` to read the database again. */
export function ensureRecordsLoaded(force = false): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (loading) return loading;
  if (!force && state.status === "ready") return Promise.resolve();
  set({ ...state, status: state.status === "ready" ? "ready" : "loading", error: null });
  loading = adminFetch<ProjectRecordDto[]>("GET", "/api/admin/projects")
    .then((records) => {
      baselines.clear();
      records.forEach((r) => baselines.set(r.def.slug, clone(bundleOf(r))));
      set({ status: "ready", records, error: null, meta: {} });
    })
    .catch((e: unknown) => {
      set({ ...state, status: state.status === "ready" ? "ready" : "error", error: e instanceof Error ? e.message : "Could not load projects." });
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Reads every project again so a change made in another tab or on another device shows up. A project with edits that
 * are not saved yet keeps its local copy (only the card counts update), so typing is never overwritten.
 */
export async function refreshRecords(): Promise<void> {
  if (typeof window === "undefined" || state.status !== "ready" || loading) return;
  let fresh: ProjectRecordDto[];
  try {
    fresh = await adminFetch<ProjectRecordDto[]>("GET", "/api/admin/projects");
  } catch {
    return; // stay on what we have; the next focus tries again
  }
  const records = fresh.map((dto) => {
    const cur = state.records.find((r) => r.def.slug === dto.def.slug);
    const base = baselines.get(dto.def.slug);
    if (cur && base && !sameJson(bundleOf(cur), base)) return { ...cur, stageCounts: dto.stageCounts };
    baselines.set(dto.def.slug, clone(bundleOf(dto)));
    return dto;
  });
  for (const slug of [...baselines.keys()]) if (!fresh.some((r) => r.def.slug === slug)) baselines.delete(slug);
  set({ ...state, records });
}

const REFRESH_MIN_GAP_MS = 15_000;
let lastRefresh = 0;

function refreshOnReturn() {
  if (document.visibilityState !== "visible" || Date.now() - lastRefresh < REFRESH_MIN_GAP_MS) return;
  lastRefresh = Date.now();
  void refreshRecords();
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", refreshOnReturn);
  window.addEventListener("focus", refreshOnReturn);
}

export const getRecord = (slug: string) => state.records.find((r) => r.def.slug === slug);
/** Where a renamed slug went, so a screen that still holds the old one keeps working until it navigates. */
export const slugAlias = (slug: string) => aliases.get(slug);
export const getBaseline = (slug: string) => baselines.get(slug);
export const setBaseline = (slug: string, b: ProjectBundle) => void baselines.set(slug, clone(b));

/** Applies an edit to the local copy. The caller syncs it to the server. */
export function setLocalBundle(slug: string, next: ProjectBundle) {
  set({ ...state, records: state.records.map((r) => (r.def.slug === slug ? { ...r, ...next } : r)) });
}

export function setMeta(slug: string, patch: Partial<RecordMeta>) {
  set({ ...state, meta: { ...state.meta, [slug]: { ...metaFor(state, slug), ...patch } } });
}

/** Keeps the per-stage card counts right after cards move because a stage was deleted. */
export function moveStageCount(slug: string, from: string, to: string) {
  set({
    ...state,
    records: state.records.map((r) => {
      if (r.def.slug !== slug) return r;
      const counts = { ...r.stageCounts, [to]: (r.stageCounts[to] ?? 0) + (r.stageCounts[from] ?? 0) };
      delete counts[from];
      return { ...r, stageCounts: counts };
    }),
  });
}

/** Re-reads only the per-stage card counts of one project, so edits in progress are left alone. */
export async function refreshStageCounts(slug: string): Promise<void> {
  try {
    const dto = await adminFetch<ProjectRecordDto>("GET", `/api/admin/projects/${slug}`);
    set({ ...state, records: state.records.map((r) => (r.def.slug === slug ? { ...r, stageCounts: dto.stageCounts } : r)) });
  } catch {
    /* counts stay as they were */
  }
}

/** Creates a blank project or a copy on the server and adds it to the cache. */
export async function createRemoteProject(input: { name: string; mode: "blank" | "duplicate"; sourceSlug?: string }): Promise<ProjectRecordDto> {
  const dto = await adminFetch<ProjectRecordDto>("POST", "/api/admin/projects", input);
  baselines.set(dto.def.slug, clone(bundleOf(dto)));
  set({ ...state, status: "ready", records: [...state.records, dto] });
  return dto;
}

/**
 * Deactivates ("closed") or reactivates ("open") a project. The card changes at once and goes back if the server refuses.
 * Goes through the dedicated route so the change is audited. Any unsaved edit in the settings screen is left alone.
 */
export async function setRemoteStatus(slug: string, status: "open" | "closed"): Promise<void> {
  const rec = getRecord(slug);
  if (!rec) throw new Error("Project not found.");
  const before = rec.def.status;
  const apply = (s: "open" | "closed") => {
    set({ ...state, records: state.records.map((r) => (r.def.slug === slug ? { ...r, def: { ...r.def, status: s } } : r)) });
    const base = baselines.get(slug);
    if (base) baselines.set(slug, { ...base, def: { ...base.def, status: s } });
  };
  apply(status);
  try {
    await adminFetch("PATCH", `/api/admin/projects/${slug}`, { status });
  } catch (e) {
    apply(before);
    throw e;
  }
}

export type DeletionPreviewDto = { slug: string; name: string; deleting: boolean; counts: { applicants: number; files: number; stages: number; questions: number; templates: number; messages: number } };

export const previewRemoteDelete = (slug: string) => adminFetch<DeletionPreviewDto>("DELETE", `/api/admin/projects/${slug}?preview=1`);

/**
 * Deletes a project on the server and drops it from the cache. A big project can take several calls: each call
 * works inside a time budget and the loop calls again until the server says done. The project is hidden from the list
 * from the first call on, so it leaves the screen at once.
 */
export async function deleteRemoteProject(slug: string): Promise<{ done: boolean }> {
  let done = false;
  for (let i = 0; i < 6 && !done; i++) {
    const out = await adminFetch<{ done: boolean }>("DELETE", `/api/admin/projects/${slug}`, { confirmSlug: slug });
    done = out.done;
    if (i === 0) {
      baselines.delete(slug);
      set({ ...state, records: state.records.filter((r) => r.def.slug !== slug) });
    }
  }
  return { done };
}

/** Moves a cached project to its new slug. The one place a slug changes on the client. */
export function renameCachedSlug(oldSlug: string, newSlug: string) {
  const base = baselines.get(oldSlug);
  aliases.set(oldSlug, newSlug);
  baselines.delete(oldSlug);
  if (base) baselines.set(newSlug, { ...base, def: { ...base.def, slug: newSlug } });
  const { [oldSlug]: oldMeta, ...restMeta } = state.meta;
  set({
    ...state,
    records: state.records.map((r) => (r.def.slug === oldSlug ? { ...r, def: { ...r.def, slug: newSlug } } : r)),
    meta: { ...restMeta, [newSlug]: { ...(oldMeta ?? NO_META), savedAt: Date.now(), error: null } },
  });
}

/** Test helper: forget everything. */
export function resetRecords() {
  baselines.clear();
  aliases.clear();
  loading = null;
  set(EMPTY_RECORDS);
}
