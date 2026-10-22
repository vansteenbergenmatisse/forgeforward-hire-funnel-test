"use client";

import { useMemo, useSyncExternalStore } from "react";
import { applicantsApi } from "./api-client";
import { applyMessage, applyMove, patchApplicant } from "./mutations";
import type { ApplicantActions, ApplicantView } from "./types";

// API-backed store. Same hook and actions as the mock store. Changes apply at once (optimistic),
// the server answer replaces the card, and a failed call reloads the list.

const EMPTY: ApplicantView[] = [];
const POLL_MS = 30_000;

let state: ApplicantView[] = EMPTY;
let loaded = false;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: ApplicantView[]) {
  state = next;
  listeners.forEach((l) => l());
}

export async function reloadApplicants(): Promise<void> {
  inFlight ??= applicantsApi
    .list()
    .then((list) => {
      loaded = true;
      setState(list);
    })
    .catch(() => {
      // Keep what we have. The next poll retries.
    })
    .finally(() => {
      inFlight = null;
      listeners.forEach((l) => l());
    });
  return inFlight;
}

function replace(next: ApplicantView) {
  setState(state.map((a) => (a.id === next.id ? next : a)));
}

function optimistic(id: string, fn: (a: ApplicantView) => ApplicantView, send: () => Promise<ApplicantView>) {
  setState(state.map((a) => (a.id === id ? fn(a) : a)));
  send().then(replace, () => void reloadApplicants());
}

const actions: ApplicantActions = {
  moveToStage: (id, stageId) => optimistic(id, (a) => applyMove(a, stageId), () => applicantsApi.moveToStage(id, stageId)),
  placeOnBoard: (id, stageId) => optimistic(id, (a) => applyMove(a, stageId), () => applicantsApi.moveToStage(id, stageId)),
  setScore: (id, score) => optimistic(id, (a) => patchApplicant(a, { score }), () => applicantsApi.setScore(id, score)),
  setNotes: (id, notes) => optimistic(id, (a) => patchApplicant(a, { notes }), () => applicantsApi.setNotes(id, notes)),
  markRead: (id) => {
    const a = state.find((x) => x.id === id);
    if (!a?.unreadReply) return;
    optimistic(id, (x) => patchApplicant(x, { unreadReply: false }), () => applicantsApi.markRead(id));
  },
  // Messages are persisted by the messaging feature, not here. This keeps the local list in step until the next reload.
  addMessage: (id, message) => setState(state.map((a) => (a.id === id ? applyMessage(a, message) : a))),
  linkBooking: (id, booking) => {
    applicantsApi.linkBooking(booking.id, id).then(replace, () => void reloadApplicants());
  },
  remove: (id) => {
    const before = state;
    setState(state.filter((a) => a.id !== id));
    applicantsApi.remove(id).catch(() => setState(before));
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 || !loaded) void reloadApplicants();
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

export function getHttpSnapshot(): ApplicantView[] {
  return state;
}

export function useHttpApplicants(projectSlug?: string): { applicants: ApplicantView[]; actions: ApplicantActions; loading: boolean } {
  const all = useSyncExternalStore(subscribe, getHttpSnapshot, () => EMPTY);
  const loading = !loaded;
  const applicants = useMemo(() => (projectSlug ? all.filter((a) => a.projectSlug === projectSlug) : all), [all, projectSlug]);
  return { applicants, actions, loading };
}
