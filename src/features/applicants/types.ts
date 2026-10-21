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
};

export type ApplicantActions = {
  moveToStage(id: string, stageId: string): void;
  setScore(id: string, score: number | null): void;
  setNotes(id: string, notes: string): void;
  markRead(id: string): void;
  addMessage(id: string, message: Omit<MessageRow, "id" | "at"> & { at?: string }): void;
  remove(id: string): void;
  /** Adds a card to the board from "Did not finish". */
  placeOnBoard(id: string, stageId: string): void;
};
