import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const projects = pgTable("projects", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
  intro: text("intro").notNull().default(""),
  calLink: text("cal_link").notNull().default(""),
  videoPrompt: text("video_prompt").notNull(),
  prepSeconds: integer("prep_seconds").notNull().default(60),
  maxRecordSeconds: integer("max_record_seconds").notNull().default(60),
  retakesAllowed: integer("retakes_allowed").notNull().default(1),
  taskEnabled: boolean("task_enabled").notNull().default(true),
  taskTitle: text("task_title").notNull().default(""),
  taskContent: jsonb("task_content").$type<unknown>(),
  taskAllowText: boolean("task_allow_text").notNull().default(true),
  taskAllowLink: boolean("task_allow_link").notNull().default(true),
  taskAllowFile: boolean("task_allow_file").notNull().default(false),
  thankYouText: text("thank_you_text").notNull(),
  replyDays: integer("reply_days").notNull().default(5),
  handoffEnabled: boolean("handoff_enabled").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "number",
  "single_choice",
  "multi_choice",
  "yes_no",
] as const;

export const projectQuestions = pgTable(
  "project_questions",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    helpText: text("help_text").notNull().default(""),
    type: text("type", { enum: QUESTION_TYPES }).notNull(),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    required: boolean("required").notNull().default(true),
    position: integer("position").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("project_questions_project_idx").on(t.projectId)],
);

export const STAGE_ROLES = ["entry_new", "entry_task", "on_booking"] as const;

export const stages = pgTable(
  "stages",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("gray"),
    position: integer("position").notNull().default(0),
    isPositive: boolean("is_positive").notNull().default(false),
    role: text("role", { enum: STAGE_ROLES }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("stages_project_idx").on(t.projectId),
    uniqueIndex("stages_project_role_uq")
      .on(t.projectId, t.role)
      .where(sql`${t.role} is not null`),
  ],
);

export const FUNNEL_STEPS = ["form_done", "video_done", "completed"] as const;

export type AnswerValue = { label: string; type: string; value: string | number | boolean | string[] };
export type BookingInfo = { uid: string; start: string; end: string; status: string };

export const applicants = pgTable(
  "applicants",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    stageId: uuid("stage_id").references(() => stages.id, { onDelete: "set null" }),
    resumeToken: text("resume_token").notNull().unique(),
    isTest: boolean("is_test").notNull().default(false),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phoneE164: text("phone_e164").notNull(),
    phoneCountry: text("phone_country"),
    whatsappOk: boolean("whatsapp_ok").notNull().default(false),
    timezone: text("timezone").notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    consentText: text("consent_text").notNull(),
    answers: jsonb("answers").$type<Record<string, AnswerValue>>().notNull().default({}),
    funnelStep: text("funnel_step", { enum: FUNNEL_STEPS }).notNull().default("form_done"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    videoKey: text("video_key"),
    videoMime: text("video_mime"),
    videoBytes: integer("video_bytes"),
    videoSeconds: integer("video_seconds"),
    audioOnly: boolean("audio_only").notNull().default(false),
    retakeUsed: boolean("retake_used").notNull().default(false),
    thumbKey: text("thumb_key"),
    videoDeletedAt: timestamp("video_deleted_at", { withTimezone: true }),
    didTask: boolean("did_task").notNull().default(false),
    taskText: text("task_text"),
    taskLink: text("task_link"),
    taskFileKey: text("task_file_key"),
    taskFileName: text("task_file_name"),
    taskFileBytes: integer("task_file_bytes"),
    score: integer("score"),
    notes: text("notes").notNull().default(""),
    appliedBefore: boolean("applied_before").notNull().default(false),
    previousApplicantId: uuid("previous_applicant_id"),
    booking: jsonb("booking").$type<BookingInfo>(),
    handoffToken: text("handoff_token"),
    handoffExpiresAt: timestamp("handoff_expires_at", { withTimezone: true }),
    utm: jsonb("utm").$type<Record<string, string>>().notNull().default({}),
    userAgent: text("user_agent"),
    inAppBrowser: boolean("in_app_browser").notNull().default(false),
    unreadReply: boolean("unread_reply").notNull().default(false),
    lastStageChangeAt: timestamp("last_stage_change_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("applicants_project_idx").on(t.projectId),
    index("applicants_stage_idx").on(t.stageId),
    index("applicants_email_idx").on(t.projectId, t.email),
    index("applicants_handoff_idx").on(t.handoffToken),
  ],
);

export const applicantEvents = pgTable(
  "applicant_events",
  {
    id: id(),
    applicantId: uuid("applicant_id").notNull().references(() => applicants.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("applicant_events_applicant_idx").on(t.applicantId)],
);

export const CHANNELS = ["email", "sms", "whatsapp"] as const;

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    channel: text("channel", { enum: CHANNELS }).notNull(),
    name: text("name").notNull(),
    subject: text("subject").notNull().default(""),
    body: text("body").notNull(),
    waTemplateName: text("wa_template_name"),
    waLanguage: text("wa_language"),
    waVariables: jsonb("wa_variables").$type<string[]>().notNull().default([]),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("message_templates_project_idx").on(t.projectId)],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    applicantId: uuid("applicant_id").notNull().references(() => applicants.id, { onDelete: "cascade" }),
    channel: text("channel", { enum: CHANNELS }).notNull(),
    direction: text("direction", { enum: ["out", "in"] }).notNull(),
    mode: text("mode", { enum: ["api", "link"] }).notNull().default("link"),
    templateId: uuid("template_id").references(() => messageTemplates.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    providerMessageId: text("provider_message_id"),
    status: text("status", {
      enum: ["sent", "delivered", "read", "failed", "opened_link", "received"],
    }).notNull(),
    error: text("error"),
    readByMatt: boolean("read_by_matt").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("messages_applicant_idx").on(t.applicantId),
    index("messages_provider_idx").on(t.providerMessageId),
  ],
);

export const unmatchedBookings = pgTable("unmatched_bookings", {
  id: id(),
  payload: jsonb("payload").$type<unknown>().notNull(),
  attendeeEmail: text("attendee_email"),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const processedWebhooks = pgTable(
  "processed_webhooks",
  {
    id: id(),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("processed_webhooks_uq").on(t.provider, t.externalId)],
);

export const idempotencyKeys = pgTable("idempotency_keys", {
  id: id(),
  key: text("key").notNull().unique(),
  route: text("route").notNull(),
  response: jsonb("response").$type<unknown>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const systemErrors = pgTable("system_errors", {
  id: id(),
  source: text("source").notNull(),
  message: text("message").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  applicantId: uuid("applicant_id"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const backups = pgTable("backups", {
  id: id(),
  r2Key: text("r2_key").notNull(),
  bytes: integer("bytes").notNull().default(0),
  ok: boolean("ok").notNull(),
  error: text("error"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// Spam guard for POST /api/apply/start (5 per IP per 10 minutes). Postgres, no Redis.
export const rateLimitHits = pgTable(
  "rate_limit_hits",
  {
    id: id(),
    bucket: text("bucket").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("rate_limit_hits_bucket_idx").on(t.bucket, t.createdAt)],
);
