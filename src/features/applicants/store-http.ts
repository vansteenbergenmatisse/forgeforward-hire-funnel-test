"use client";

import { useMemo, useSyncExternalStore } from "react";
import { ApplicantsApiError, applicantsApi } from "./api-client";
import { applyMessage, applyMove, patchApplicant } from "./mutations";
import type { ApplicantActions, ApplicantView, ApplicantsLoadError, UseApplicantsResult } from "./types";

// API-backed store. Same hook and actions as the mock store. Changes apply at once (optimistic),
// the server answer replaces the card, and a failed call reloads the list.
//
// Ordering rules, so a slow answer never undoes a newer change:
// - Every local change bumps `mutationSeq`. A list fetched before the latest change is thrown away.
// - Changes to one applicant are sent one at a time, in order. Only the answer to the newest one is applied.

const EMPTY: ApplicantView[] = [];
const POLL_MS = 30_000;

type Meta = { loaded: boolean; error: ApplicantsLoadError | null; truncated: boolean };
const INITIAL_META: Meta = { loaded: false, error: null, truncated: false };

let state: ApplicantView[] = EMPTY;
let meta: Meta = INITIAL_META;
let mutationSeq = 0;
let pendingMutations = 0;
let discardedSnapshot = false;
let inFlight: { seq: number; promise: Promise<void> } | null = null;
const queues = new Map<string, Promise<unknown>>();
const newest = new Map<string, number>();
let ticket = 0;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

function setState(next: ApplicantView[]) {
  state = next;
  notify();
}

function setMeta(patch: Partial<Meta>) {
  meta = { ...meta, ...patch };
  notify();
}

/** Test helper: forget everything. */
export function resetHttpStore(): void {
  state = EMPTY;
  meta = INITIAL_META;
  mutationSeq = 0;
  pendingMutations = 0;
  discardedSnapshot = false;
  inFlight = null;
  queues.clear();
  newest.clear();
}

/** List rows come without timeline and messages. A row that already had them keeps them until the detail is read again. */
export function keepLoadedDetail(prev: ApplicantView[], next: ApplicantView[]): ApplicantView[] {
  const byId = new Map(prev.map((a) => [a.id, a]));
  return next.map((a) => {
    if (a.detail !== false) return a;
    const old = byId.get(a.id);
    return old && old.detail !== false ? { ...a, events: old.events, messages: old.messages, detail: true } : a;
  });
}

export function reloadApplicants(): Promise<void> {
  // An answer that was requested before the latest local change is stale, so it is never reused.
  if (inFlight && inFlight.seq === mutationSeq) return inFlight.promise;
  const seq = mutationSeq;
  const entry: { seq: number; promise: Promise<void> } = {
    seq,
    promise: applicantsApi
      .list()
      .then(({ applicants: list, truncated }) => {
        if (seq !== mutationSeq || pendingMutations > 0) {
          discardedSnapshot = true;
          return;
        }
        discardedSnapshot = false;
        state = keepLoadedDetail(state, list);
        setMeta({ loaded: true, error: null, truncated });
      })
      .catch((e: unknown) => {
        // Keep what we have. The next poll retries.
        setMeta({ error: e instanceof ApplicantsApiError && e.sessionEnded ? "session" : "network" });
      })
      .finally(() => {
        if (inFlight === entry) inFlight = null;
      }),
  };
  inFlight = entry;
  return entry.promise;
}

function begin() {
  mutationSeq += 1;
  pendingMutations += 1;
}

function settle() {
  pendingMutations -= 1;
  if (pendingMutations === 0 && discardedSnapshot) {
    discardedSnapshot = false;
    void reloadApplicants();
  }
}

function replace(next: ApplicantView) {
  setState(state.map((a) => (a.id === next.id ? next : a)));
}

/** Applies `fn` now, then sends the change after earlier changes to the same applicant. Resolves true when the server kept it. */
function optimistic(id: string, fn: (a: ApplicantView) => ApplicantView, send: () => Promise<ApplicantView>): Promise<boolean> {
  begin();
  const mine = ++ticket;
  newest.set(id, mine);
  setState(state.map((a) => (a.id === id ? fn(a) : a)));
  const run: Promise<boolean> = (queues.get(id) ?? Promise.resolve())
    .then(send)
    .then(
      (next) => {
        if (newest.get(id) === mine) replace(next);
        return true;
      },
      () => {
        discardedSnapshot = true;
        return false;
      },
    )
    .finally(() => {
      if (queues.get(id) === run) {
        queues.delete(id);
        newest.delete(id);
      }
      settle();
    });
  queues.set(id, run);
  return run;
}

/** Short reason for the admin when a delete did not go through. */
export function deleteFailureText(e: unknown): string {
  if (e instanceof ApplicantsApiError) {
    if (e.code === "files_failed") return "The video files could not be deleted, so nothing was removed. Try again.";
    if (e.status === 0) return "Could not reach the server. Nothing was deleted.";
    if (e.sessionEnded) return "Could not delete. Your session may have ended. Open your admin link again.";
  }
  return "Could not delete the applicant. Nothing was removed.";
}

/** Reads one applicant with timeline and messages. A card with a change in flight is left alone, its answer carries the detail. */
async function loadDetail(id: string): Promise<void> {
  if (newest.has(id)) return;
  const seq = mutationSeq;
  try {
    const next = await applicantsApi.get(id);
    if (newest.has(id) || seq !== mutationSeq) return;
    if (state.some((a) => a.id === id)) replace(next);
  } catch {
    // The drawer keeps showing what it has. The next read retries.
  }
}

export const httpActions: ApplicantActions = {
  loadDetail,
  moveToStage: (id, stageId) => void optimistic(id, (a) => applyMove(a, stageId), () => applicantsApi.moveToStage(id, stageId)),
  placeOnBoard: (id, stageId) => void optimistic(id, (a) => applyMove(a, stageId), () => applicantsApi.moveToStage(id, stageId)),
  setScore: (id, score) => void optimistic(id, (a) => patchApplicant(a, { score }), () => applicantsApi.setScore(id, score)),
  setNotes: (id, notes) => optimistic(id, (a) => patchApplicant(a, { notes }), () => applicantsApi.setNotes(id, notes)),
  markRead: (id) => {
    const a = state.find((x) => x.id === id);
    if (!a?.unreadReply) return;
    void optimistic(id, (x) => patchApplicant(x, { unreadReply: false }), () => applicantsApi.markRead(id));
  },
  // Messages are persisted by the messaging feature, not here. This keeps the local list in step until the next reload.
  addMessage: (id, message) => {
    mutationSeq += 1;
    setState(state.map((a) => (a.id === id ? applyMessage(a, message) : a)));
  },
  linkBooking: async (id, booking) => {
    begin();
    try {
      replace(await applicantsApi.linkBooking(booking.id, id));
      return true;
    } catch {
      discardedSnapshot = true;
      return false;
    } finally {
      settle();
    }
  },
  // The card stays until the server confirms, so a failed privacy delete is never shown as done.
  remove: async (id) => {
    begin();
    try {
      await applicantsApi.remove(id);
      setState(state.filter((a) => a.id !== id));
      return null;
    } catch (e) {
      return deleteFailureText(e);
    } finally {
      settle();
    }
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 || !meta.loaded) void reloadApplicants();
  const timer = window.setInterval(() => {
    if (document.visibilityState === "visible") void reloadApplicants();
  }, POLL_MS);
  const onVisible = () => {
    if (document.visibilityState === "visible") void reloadApplicants();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    listeners.delete(listener);
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export function getHttpMeta(): Readonly<Meta> {
  return meta;
}

export function getHttpSnapshot(): ApplicantView[] {
  return state;
}

const getMeta = () => meta;
const reload = () => void reloadApplicants();

export function useHttpApplicants(projectSlug?: string): UseApplicantsResult {
  const all = useSyncExternalStore(subscribe, getHttpSnapshot, () => EMPTY);
  const m = useSyncExternalStore(subscribe, getMeta, () => INITIAL_META);
  const applicants = useMemo(() => (projectSlug ? all.filter((a) => a.projectSlug === projectSlug) : all), [all, projectSlug]);
  return { applicants, actions: httpActions, loading: !m.loaded && m.error === null, error: m.error, truncated: m.truncated, reload };
}
