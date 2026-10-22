import type { ProjectBundle } from "@/features/projects";

/** A project with everything a duplicate copies. */
export type ProjectRecord = ProjectBundle;

export type UnmatchedBooking = {
  id: string;
  email: string;
  title: string;
  /** ISO start time. */
  start: string;
  /** Display text for the slot, e.g. "Thu Oct 29, 10:00 AM ET". */
  when: string;
  /** Set when linked to an applicant. Linked rows leave the box. */
  linkedApplicantId?: string;
  dismissed?: boolean;
};

export type SystemAlert = {
  id: string;
  title: string;
  detail: string;
  resolved: boolean;
};

export type ProjectsState = {
  projects: ProjectRecord[];
  bookings: UnmatchedBooking[];
  alerts: SystemAlert[];
  /** True until the first load from the server finishes. */
  loading: boolean;
  /** Set when the first load failed. */
  error: string | null;
};
