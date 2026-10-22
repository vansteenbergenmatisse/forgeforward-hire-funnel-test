import type { ApplicantView, UnmatchedBookingView } from "./types";

const BASE = "/api/admin";

/** A failed admin call. `status` 0 means the server could not be reached. `code` is the server's error code when it sent one. */
export class ApplicantsApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }

  /** The proxy answers 404 when the admin cookie is missing, expired or rotated. */
  get sessionEnded(): boolean {
    return this.status === 404 || this.status === 401;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: init?.body ? { "content-type": "application/json" } : undefined,
    });
  } catch {
    throw new ApplicantsApiError(0, "network", "Could not reach the server.");
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApplicantsApiError(res.status, data?.error ?? "error", `${init?.method ?? "GET"} ${path} failed (${res.status})`);
  }
  return (await res.json()) as T;
}

const patch = (id: string, body: Record<string, unknown>) =>
  call<{ applicant: ApplicantView }>(`/applicants/${id}`, { method: "PATCH", body: JSON.stringify(body) }).then((r) => r.applicant);

export const applicantsApi = {
  /** Board rows without events and messages. `truncated` = the server holds more than it sent. */
  list: () => call<{ applicants: ApplicantView[]; truncated?: boolean }>("/applicants").then((r) => ({ applicants: r.applicants, truncated: Boolean(r.truncated) })),
  /** One applicant with timeline and messages. */
  get: (id: string) => call<{ applicant: ApplicantView }>(`/applicants/${id}`).then((r) => r.applicant),
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
