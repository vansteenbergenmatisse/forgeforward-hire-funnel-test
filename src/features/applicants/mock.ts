import { MOCK_QUESTIONS } from "@/features/projects";
import { APPOINTMENT_SETTER_SEEDS, SALES_REP_SEEDS, type Seed } from "./mock-people";
import type { ApplicantView, MessageRow, TimelineEvent } from "./types";

/** Fixed "now" for the fixtures: all dates below are relative to it. */
export const MOCK_NOW = new Date("2026-10-21T15:42:00Z");

const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

const COUNTRY = {
  PH: { dial: "63", tz: "Asia/Manila", phone: (n: number) => `+639175550${String(100 + n).slice(-3)}` },
  ZA: { dial: "27", tz: "Africa/Johannesburg", phone: (n: number) => `+2782555${String(1000 + n).slice(-4)}` },
  US: { dial: "1", tz: "America/New_York", phone: (n: number) => `+141555501${String(10 + n).slice(-2)}` },
} as const;

const TASK_TEXT =
  "Hi Mike, it's {name} from Forge Forward. You asked about getting more lawn jobs. Do you have 10 minutes today at 3 or 5 to see how we'd fill your calendar?";

const QUESTION_LABEL: Record<string, string> = {
  "appointment-setter": MOCK_QUESTIONS[0].label,
  "sales-rep": "How many years have you worked in sales?",
};
const QUESTION_ID: Record<string, string> = { "appointment-setter": MOCK_QUESTIONS[0].id, "sales-rep": "q-sales-years" };

function ev(id: string, type: string, at: number, data?: Record<string, unknown>): TimelineEvent {
  return data ? { id, type, at: iso(at), data } : { id, type, at: iso(at) };
}

function build(slug: string, seed: Seed, index: number): ApplicantView {
  const c = COUNTRY[seed.cc];
  const id = `ap-${slug === "appointment-setter" ? "as" : "sr"}-${String(index + 1).padStart(2, "0")}`;
  const created = MOCK_NOW.getTime() - seed.h * HOUR;
  const completed = seed.stage !== null;
  const hasVideo = seed.stage !== null || seed.progress === "video";
  const didTask = Boolean(seed.task);
  const email = `${seed.f}.${seed.l}`.toLowerCase().replace(/\s+/g, "") + (seed.cc === "US" ? "@gmail.com" : seed.cc === "PH" ? "@yahoo.com" : "@outlook.com");
  const name = seed.f;

  const events: TimelineEvent[] = [ev(`${id}-e1`, "form_submitted", created)];
  if (hasVideo) events.push(ev(`${id}-e2`, "video_saved", created + 7 * 60_000, { seconds: seed.audio ? 48 : 57 }));
  let t = created + 12 * 60_000;
  if (didTask) {
    events.push(ev(`${id}-e3`, "task_submitted", t));
  } else if (completed) {
    events.push(ev(`${id}-e3`, "task_skipped", t));
  }
  if (completed) {
    events.push(ev(`${id}-e4`, "application_completed", t + 1000));
    const entry = didTask ? "st-task" : "st-new";
    events.push(ev(`${id}-e5`, "stage_changed", t + 2000, { from: null, to: entry }));
    t += 3000;
  }
  let lastChange: string | null = completed ? iso(t - 1000) : null;
  if (completed && seed.stage && seed.stage !== (didTask ? "st-task" : "st-new")) {
    const at = created + Math.min(seed.h * HOUR * 0.4, 3 * 24 * HOUR) + 24 * HOUR / 2;
    const when = Math.min(at, MOCK_NOW.getTime() - HOUR);
    events.push(ev(`${id}-e6`, "stage_changed", when, { from: didTask ? "st-task" : "st-new", to: seed.stage }));
    lastChange = iso(when);
  }
  if (seed.booking) {
    events.push(ev(`${id}-e7`, "booking_created", MOCK_NOW.getTime() - 20 * HOUR));
    if (seed.booking === "cancelled") events.push(ev(`${id}-e8`, "booking_cancelled", MOCK_NOW.getTime() - 6 * HOUR));
    if (seed.booking === "rescheduled") events.push(ev(`${id}-e8`, "booking_rescheduled", MOCK_NOW.getTime() - 6 * HOUR));
  }
  if (seed.videoDeleted) events.push(ev(`${id}-e9`, "media_deleted", MOCK_NOW.getTime() - 5 * 24 * HOUR));

  const messages: MessageRow[] = [];
  if (seed.f === "Lerato") {
    messages.push(
      { id: `${id}-m1`, channel: "whatsapp", direction: "out", mode: "api", body: "Hi Lerato, thanks for your video. We'd like to meet you. Pick a time here: https://cal.com/forgeforward/interview Talk soon, Matt (Forge Forward)", templateName: "Interview invite", status: "read", at: "2026-10-20T07:14:00Z" },
      { id: `${id}-m2`, channel: "whatsapp", direction: "in", mode: "api", body: "Thank you! I just booked Thursday.", status: "received", at: "2026-10-20T07:31:00Z" },
    );
    events.push(ev(`${id}-e10`, "message_sent", Date.parse("2026-10-20T07:14:00Z"), { channel: "whatsapp" }), ev(`${id}-e11`, "message_received", Date.parse("2026-10-20T07:31:00Z"), { channel: "whatsapp" }));
  }
  if (seed.f === "Paolo") {
    messages.push({ id: `${id}-m1`, channel: "email", direction: "out", mode: "link", subject: "Your Forge Forward interview", body: "Hi Paolo, thanks for your video. We'd like to meet you.", templateName: "Interview invite", status: "opened_link", at: iso(MOCK_NOW.getTime() - 22 * HOUR) });
    events.push(ev(`${id}-e10`, "message_sent", MOCK_NOW.getTime() - 22 * HOUR, { channel: "email" }));
  }
  events.sort((a, b) => a.at.localeCompare(b.at));

  const mediaSrc = seed.audio ? "/mock/sample-audio.m4a" : "/mock/sample.mp4";
  const bookingStart = Date.parse("2026-10-22T14:00:00Z");

  return {
    id,
    projectSlug: slug,
    stageId: seed.stage,
    isTest: false,
    firstName: seed.f,
    lastName: seed.l,
    email,
    phoneE164: c.phone(index),
    phoneCountry: seed.cc,
    whatsappOk: !seed.noWhatsapp,
    timezone: seed.tz ?? c.tz,
    answers: { [QUESTION_ID[slug]]: { label: QUESTION_LABEL[slug], type: "single_choice", value: seed.years } },
    funnelStep: completed ? "completed" : seed.progress === "video" ? "video_done" : "form_done",
    createdAt: iso(created),
    completedAt: completed ? iso(created + 12 * 60_000) : null,
    media: hasVideo
      ? { kind: seed.audio ? "audio" : "video", src: mediaSrc, seconds: seed.audio ? 48 : 57, bytes: seed.audio ? 720_000 : 9_400_000, deletedAt: seed.videoDeleted ? iso(MOCK_NOW.getTime() - 5 * 24 * HOUR) : null }
      : null,
    audioOnly: Boolean(seed.audio),
    retakeUsed: Boolean(seed.retake),
    didTask,
    taskText: seed.task === "text" ? TASK_TEXT.replace("{name}", name) : null,
    taskLink: seed.task === "link" ? "https://docs.google.com/document/d/mock-first-text" : null,
    taskFile: seed.task === "file" ? { name: "first-text.txt", url: "/mock/first-text.txt", bytes: 412 } : null,
    score: seed.score ?? null,
    notes: seed.notes ?? "",
    appliedBefore: Boolean(seed.before),
    booking: seed.booking ? { start: iso(bookingStart), end: iso(bookingStart + 30 * 60_000), status: seed.booking === "cancelled" ? "cancelled" : seed.booking } : null,
    unreadReply: Boolean(seed.unread),
    lastStageChangeAt: lastChange,
    events,
    messages,
  };
}

/** Fresh copy of the fixtures. Called by the store on first load and by resetMockData(). */
export function buildMockApplicants(): ApplicantView[] {
  return [
    ...APPOINTMENT_SETTER_SEEDS.map((s, i) => build("appointment-setter", s, i)),
    ...SALES_REP_SEEDS.map((s, i) => build("sales-rep", s, i)),
  ];
}
