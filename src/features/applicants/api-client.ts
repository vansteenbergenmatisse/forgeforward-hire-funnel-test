import type { ApplicantView, UnmatchedBookingView } from "./types";

const BASE = "/api/admin";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "same-origin",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed (${res.status})`);
  return (await res.json()) as T;
}

const patch = (id: string, body: Record<string, unknown>) =>
  call<{ applicant: ApplicantView }>(`/applicants/${id}`, { method: "PATCH", body: JSON.stringify(body) }).then((r) => r.applicant);

export const applicantsApi = {
  list: () => call<{ applicants: ApplicantView[] }>("/applicants").then((r) => r.applicants),
  moveToStage: (id: string, stageId: string) => patch(id, { stageId }),
  setScore: (id: string, score: number | null) => patch(id, { score }),
  setNotes: (id: string, notes: string) => patch(id, { notes }),
  markRead: (id: string) => patch(id, { unreadReply: false }),
  remove: (id: string) => call<{ ok: true }>(`/applicants/${id}`, { method: "DELETE" }),
  unmatched: () => call<{ bookings: UnmatchedBookingView[] }>("/unmatched-bookings").then((r) => r.bookings),
  linkBooking: (bookingId: string, applicantId: string) =>
    call<{ applicant: ApplicantView }>(`/unmatched-bookings/${bookingId}/link`, {
      method: "POST",
      body: JSON.stringify({ applicantId }),
    }).then((r) => r.applicant),
  dismissBooking: (bookingId: string) => call<{ ok: true }>(`/unmatched-bookings/${bookingId}`, { method: "DELETE" }),
};
