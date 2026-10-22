import type { Channel } from "@/features/projects";

export type BookingStatus = "booked" | "rescheduled" | "cancelled";

export type TimelineEvent = {
  id: string;
  /** form_submitted | video_saved | task_submitted | task_skipped | application_completed | stage_changed | booking_created | booking_rescheduled | booking_cancelled | message_sent | message_received | media_deleted | handoff_used */
  type: string;
  at: string; // ISO
  data?: Record<string, unknown>;
};

export type MessageRow = {
  id: string;
  channel: Channel;
  direction: "out" | "in";
  mode: "api" | "link";
  body: string;
  subject?: string;
  templateName?: string;
  status: "sent" | "delivered" | "read" | "failed" | "opened_link" | "received";
  at: string; // ISO
};

export type MediaView = {
  kind: "video" | "audio";
  src: string;
  seconds: number;
  bytes: number;
  /** ISO when retention removed the file. The card then shows "Video deleted". */
  deletedAt: string | null;
};

export type AnswerView = { label: string; type: string; value: string | number | boolean | string[] };

/** Front-end view model. Mirrors the DB `applicants` table (src/platform/db/schema.ts). */
export type ApplicantView = {
  id: string;
  projectSlug: string;
  /** null until the application completes ("Did not finish" tab). */
  stageId: string | null;
  isTest: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phoneE164: string;
  phoneCountry: string; // ISO 3166-1 alpha-2, shown as a text chip, never a flag emoji
  whatsappOk: boolean;
  timezone: string; // IANA
  answers: Record<string, AnswerView>;
  funnelStep: "form_done" | "video_done" | "completed";
  createdAt: string; // ISO
  completedAt: string | null;
  media: MediaView | null;
  audioOnly: boolean;
  retakeUsed: boolean;
  didTask: boolean;
  taskText: string | null;
  taskLink: string | null;
  taskFile: { name: string; url: string; bytes: number } | null;
  score: number | null; // 1..5
  notes: string;
  appliedBefore: boolean;
  booking: { start: string; end: string; status: BookingStatus } | null;
  unreadReply: boolean;
  lastStageChangeAt: string | null;
  events: TimelineEvent[];
  messages: MessageRow[];
  /** false = a list row: `events` and `messages` are empty until the detail is loaded. Anything else = complete. */
  detail?: boolean;
};

export type ApplicantActions = {
  moveToStage(id: string, stageId: string): void;
  setScore(id: string, score: number | null): void;
  /** Resolves true when the server kept the notes. */
  setNotes(id: string, notes: string): Promise<boolean>;
  markRead(id: string): void;
  addMessage(id: string, message: Omit<MessageRow, "id" | "at"> & { at?: string }): void;
  /** Resolves null when the applicant and their files are gone, or a short reason when the delete failed. */
  remove(id: string): Promise<string | null>;
  /** Adds a card to the board from "Did not finish". */
  placeOnBoard(id: string, stageId: string): void;
  /** Links an unmatched Cal.com booking to an applicant: saves the booking, moves the card and adds the timeline event. */
  linkBooking(id: string, booking: LinkableBooking): Promise<boolean>;
  /** Loads the timeline and messages of one applicant (list rows come without them). */
  loadDetail(id: string): Promise<void>;
};

/** Why the applicant list could not be loaded. "session" = the admin cookie ended, "network" = anything else. */
export type ApplicantsLoadError = "session" | "network";

export type UseApplicantsResult = {
  applicants: ApplicantView[];
  actions: ApplicantActions;
  /** True until the first list has arrived (or failed). */
  loading: boolean;
  /** Set while the latest load failed. The last good list stays in `applicants`. */
  error: ApplicantsLoadError | null;
  /** True when the server holds more applicants than it sent. The newest ones are shown. */
  truncated: boolean;
  reload: () => void;
};

/** The unmatched booking the user picked. `id` is the unmatched_bookings row. */
export type LinkableBooking = { id: string; start: string; end?: string; title?: string };

/** Row of the "Unmatched bookings" box. */
export type UnmatchedBookingView = {
  id: string;
  email: string;
  title: string;
  /** ISO start time. */
  start: string;
  /** Display text for the slot. */
  when: string;
  linkedApplicantId?: string;
  dismissed?: boolean;
};
