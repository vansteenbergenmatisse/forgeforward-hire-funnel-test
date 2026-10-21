"use client";

import { useSyncExternalStore } from "react";
import { INITIAL_STATE } from "./mock";
import { blankProject, duplicateProject } from "./project-factory";
import type { ProjectRecord, ProjectsState } from "./types";

const STORAGE_KEY = "forge-hire:projects";
const STORAGE_VERSION = 1;

let state: ProjectsState | null = null;
const listeners = new Set<() => void>();

function load(): ProjectsState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { v?: number; state?: ProjectsState };
      if (p.v === STORAGE_VERSION && p.state && Array.isArray(p.state.projects)) return p.state;
    }
  } catch {
    /* blocked or corrupt storage: use fixtures */
  }
  return INITIAL_STATE;
}

function getSnapshot(): ProjectsState {
  if (state === null) state = load();
  return state;
}

function set(next: ProjectsState) {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, state: next }));
  } catch {
    /* keep working in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

export type CreateProjectInput = { name: string; mode: "blank" | "duplicate"; sourceSlug?: string };

export const projectsActions = {
  /** Adds a project and returns it (with its unique slug). */
  createProject(input: CreateProjectInput): ProjectRecord {
    const cur = getSnapshot();
    const taken = cur.projects.map((p) => p.def.slug);
    const source = input.mode === "duplicate" ? cur.projects.find((p) => p.def.slug === input.sourceSlug) : undefined;
    const record = source ? duplicateProject(source, input.name, taken) : blankProject(input.name, taken);
    set({ ...cur, projects: [...cur.projects, record] });
    return record;
  },
  linkBooking(bookingId: string, applicantId: string) {
    const cur = getSnapshot();
    set({ ...cur, bookings: cur.bookings.map((b) => (b.id === bookingId ? { ...b, linkedApplicantId: applicantId } : b)) });
  },
  dismissBooking(bookingId: string) {
    const cur = getSnapshot();
    set({ ...cur, bookings: cur.bookings.map((b) => (b.id === bookingId ? { ...b, dismissed: true } : b)) });
  },
  resolveAlert(alertId: string) {
    const cur = getSnapshot();
    set({ ...cur, alerts: cur.alerts.map((a) => (a.id === alertId ? { ...a, resolved: true } : a)) });
  },
  reset() {
    set(INITIAL_STATE);
  },
};

export function useProjects(): { state: ProjectsState; actions: typeof projectsActions } {
  const s = useSyncExternalStore(subscribe, getSnapshot, () => INITIAL_STATE);
  return { state: s, actions: projectsActions };
}
