"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { applicantsApi } from "@/features/applicants";
import { createRemoteProject, ensureRecordsLoaded, useRecordsState } from "@/features/projects/client";
import { INITIAL_ALERTS, INITIAL_BOOKINGS } from "./mock";
import type { ProjectRecord, SystemAlert, UnmatchedBooking } from "./types";

// Projects come from the database through the shared project cache (features/projects/client).
// Unmatched bookings come from /api/admin when NEXT_PUBLIC_ADMIN_API=http, else from fixtures. System alerts are local.

type Aux = { bookings: UnmatchedBooking[]; alerts: SystemAlert[] };

const HTTP = process.env.NEXT_PUBLIC_ADMIN_API === "http";

// Fixtures only in development mock mode. Production and http mode start empty so nobody sees invented bookings or alerts.
const SEED: Aux = HTTP || process.env.NODE_ENV === "production" ? { bookings: [], alerts: [] } : { bookings: INITIAL_BOOKINGS, alerts: INITIAL_ALERTS };

let aux: Aux = SEED;
const listeners = new Set<() => void>();

function setAux(next: Aux) {
  aux = next;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

/** Reads the open unmatched bookings from the server. No-op in mock mode. */
export async function refreshBookings(): Promise<void> {
  if (!HTTP) return;
  try {
    setAux({ ...aux, bookings: await applicantsApi.unmatched() });
  } catch {
    /* keep what we have; the next visit retries */
  }
}

export type CreateProjectInput = { name: string; mode: "blank" | "duplicate"; sourceSlug?: string };

export const projectsActions = {
  /** Creates the project in the database and returns it with its unique slug. */
  async createProject(input: CreateProjectInput): Promise<ProjectRecord> {
    return createRemoteProject(input);
  },
  linkBooking(bookingId: string, applicantId: string) {
    setAux({ ...aux, bookings: aux.bookings.map((b) => (b.id === bookingId ? { ...b, linkedApplicantId: applicantId } : b)) });
  },
  dismissBooking(bookingId: string) {
    setAux({ ...aux, bookings: aux.bookings.map((b) => (b.id === bookingId ? { ...b, dismissed: true } : b)) });
    if (HTTP) applicantsApi.dismissBooking(bookingId).catch(() => void refreshBookings());
  },
  refreshBookings,
  resolveAlert(alertId: string) {
    setAux({ ...aux, alerts: aux.alerts.map((a) => (a.id === alertId ? { ...a, resolved: true } : a)) });
  },
  /** Reads the projects from the database again. */
  reset() {
    setAux(SEED);
    void ensureRecordsLoaded(true);
  },
};

export function useProjects() {
  const records = useRecordsState();
  const a = useSyncExternalStore(subscribe, () => aux, () => SEED);
  useEffect(() => {
    void refreshBookings();
  }, []);
  const state = useMemo(
    () => ({
      projects: records.records as ProjectRecord[],
      bookings: a.bookings,
      alerts: a.alerts,
      loading: records.status === "idle" || records.status === "loading",
      error: records.status === "error" ? records.error : null,
    }),
    [records, a],
  );
  return { state, actions: projectsActions };
}
