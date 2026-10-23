import { z } from "zod";
import { QUESTION_TYPES, CHANNELS } from "@/platform/db/schema";

export const STAGE_COLORS = ["gray", "blue", "amber", "purple", "teal", "green", "red"] as const;
const STAGE_ROLE_VALUES = ["entry_new", "entry_task", "on_booking"] as const;

const uuid = z.uuid();
const text = (max: number) => z.string().max(max);
const name = (max: number) => z.string().trim().min(1).max(max);

export const slugParam = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60);

export const createProjectBody = z.strictObject({
  name: name(60),
  mode: z.enum(["blank", "duplicate"]).default("blank"),
  sourceSlug: slugParam.optional(),
});

export const statusBody = z.strictObject({ status: z.enum(["open", "closed"]) });

/** Delete confirmation: the slug must be repeated, so a stray request cannot remove a project. */
export const deleteProjectBody = z.strictObject({ confirmSlug: slugParam });

export const settingsPatch = z.strictObject({
  name: name(60),
  slug: z.string().max(60),
  status: z.enum(["open", "closed"]),
  intro: text(2000),
  calLink: text(500),
  replyDays: z.number().int().min(1).max(30),
  handoffEnabled: z.boolean(),
  videoPrompt: name(600),
  prepSeconds: z.number().int().min(0).max(300),
  maxRecordSeconds: z.number().int().min(15).max(180),
  retakesAllowed: z.number().int().min(0).max(5),
  taskEnabled: z.boolean(),
  taskTitle: text(120),
  taskBody: text(200_000),
  taskAllowText: z.boolean(),
  taskAllowLink: z.boolean(),
  taskAllowFile: z.boolean(),
  thankYouText: name(1000),
}).partial();
export type SettingsPatch = z.infer<typeof settingsPatch>;

export const createStageBody = z.strictObject({
  id: uuid.optional(),
  projectSlug: slugParam,
  name: name(40),
  color: z.enum(STAGE_COLORS).default("gray"),
  isPositive: z.boolean().default(false),
});

export const updateStageBody = z.strictObject({
  name: name(40),
  color: z.enum(STAGE_COLORS),
  isPositive: z.boolean(),
  role: z.enum(STAGE_ROLE_VALUES).nullable(),
}).partial();

export const reorderBody = z.strictObject({
  projectSlug: slugParam,
  ids: z.array(uuid).min(1).max(200),
});

const questionBase = {
  label: name(200),
  helpText: text(300).default(""),
  type: z.enum(QUESTION_TYPES),
  options: z.array(z.string().max(120)).max(30).default([]),
  required: z.boolean().default(false),
};

export const createQuestionBody = z.strictObject({
  id: uuid.optional(),
  projectSlug: slugParam,
  ...questionBase,
});

export const updateQuestionBody = z.strictObject({
  label: questionBase.label,
  helpText: text(300),
  type: questionBase.type,
  options: z.array(z.string().max(120)).max(30),
  required: z.boolean(),
  archived: z.boolean(),
}).partial();

const templateBase = {
  name: name(80),
  subject: text(200).default(""),
  body: z.string().trim().min(1).max(4000),
  waTemplateName: z.string().trim().max(512).optional(),
  waLanguage: z.string().trim().max(20).optional(),
  waVariables: z.array(z.string().max(60)).max(10).optional(),
};

export const createTemplateBody = z.strictObject({
  id: uuid.optional(),
  projectSlug: slugParam,
  channel: z.enum(CHANNELS),
  ...templateBase,
});

export const updateTemplateBody = z.strictObject({
  name: templateBase.name,
  subject: text(200),
  body: templateBase.body,
  waTemplateName: templateBase.waTemplateName,
  waLanguage: templateBase.waLanguage,
  waVariables: templateBase.waVariables,
}).partial();

export const uuidParam = uuid;
