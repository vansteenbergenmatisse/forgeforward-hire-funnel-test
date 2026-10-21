"use client";

import { useMemo, useSyncExternalStore } from "react";
import { buildMockApplicants } from "./mock";
import { applyMessage, applyMove, applyPlace, patchApplicant } from "./mutations";
import type { ApplicantActions, ApplicantView } from "./types";

const STORAGE_KEY = "forge-hire:applicants";
const STORAGE_VERSION = 1;

/** Server and first client render always see the fixtures, so hydration matches. */
const SERVER_SNAPSHOT: ApplicantView[] = buildMockApplicants();

let state: ApplicantView[] | null = null;
const listeners = new Set<() => void>();

function load(): ApplicantView[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { v?: number; applicants?: ApplicantView[] };
      if (parsed.v === STORAGE_VERSION && Array.isArray(parsed.applicants)) return parsed.applicants;
    }
  } catch {
    /* storage blocked or corrupt: fall back to fixtures */
  }
  return buildMockApplicants();
}

function persist(next: ApplicantView[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, applicants: next }));
  } catch {
    /* quota or private mode: keep working in memory */
  }
}

function getClientSnapshot(): ApplicantView[] {
  if (state === null) state = load();
  return state;
}

function setState(next: ApplicantView[]) {
  state = next;
  persist(next);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      state = load();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Current applicants outside React (event handlers, tests). Safe on the server. */
export function getApplicantsSnapshot(): ApplicantView[] {
  return typeof window === "undefined" ? SERVER_SNAPSHOT : getClientSnapshot();
}

/** Restores the fixtures and clears the saved copy. */
export function resetMockData(): void {
  if (typeof window === "undefined") return;
  setState(buildMockApplicants());
}

const update = (id: string, fn: (a: ApplicantView) => ApplicantView) =>
  setState(getClientSnapshot().map((a) => (a.id === id ? fn(a) : a)));

const actions: ApplicantActions = {
  moveToStage: (id, stageId) => update(id, (a) => applyMove(a, stageId)),
  placeOnBoard: (id, stageId) => update(id, (a) => applyPlace(a, stageId)),
  setScore: (id, score) => update(id, (a) => patchApplicant(a, { score })),
  setNotes: (id, notes) => update(id, (a) => patchApplicant(a, { notes })),
  markRead: (id) => update(id, (a) => (a.unreadReply ? patchApplicant(a, { unreadReply: false }) : a)),
  addMessage: (id, message) => update(id, (a) => applyMessage(a, message)),
  remove: (id) => setState(getClientSnapshot().filter((a) => a.id !== id)),
};

/** Applicants (all projects, or one project) plus the actions that change them. Re-renders on every change. */
export function useApplicants(projectSlug?: string): { applicants: ApplicantView[]; actions: ApplicantActions } {
  const all = useSyncExternalStore(subscribe, getClientSnapshot, () => SERVER_SNAPSHOT);
  const applicants = useMemo(() => (projectSlug ? all.filter((a) => a.projectSlug === projectSlug) : all), [all, projectSlug]);
  return { applicants, actions };
}
