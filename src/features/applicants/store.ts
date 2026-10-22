"use client";

import { getMockSnapshot, resetMockStore, useMockApplicants } from "./store-mock";
import { getHttpSnapshot, reloadApplicants, useHttpApplicants } from "./store-http";
import type { ApplicantActions, ApplicantView } from "./types";

/** NEXT_PUBLIC_ADMIN_API=http reads and writes through /api/admin. Anything else uses the fixtures. */
const HTTP = process.env.NEXT_PUBLIC_ADMIN_API === "http";

/** Applicants (all projects, or one project) plus the actions that change them. Re-renders on every change. */
export const useApplicants: (projectSlug?: string) => { applicants: ApplicantView[]; actions: ApplicantActions; loading: boolean } =
  HTTP ? useHttpApplicants : useMockApplicants;

/** Current applicants outside React (event handlers, tests). */
export function getApplicantsSnapshot(): ApplicantView[] {
  return HTTP ? getHttpSnapshot() : getMockSnapshot();
}

/** Mock mode: restores the fixtures. HTTP mode: reloads from the server. */
export function resetMockData(): void {
  if (HTTP) void reloadApplicants();
  else resetMockStore();
}
