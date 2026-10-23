import type { tables } from "@/platform/db";
import { readTaskContent } from "../sanitize-html";
import type { ProjectDef, QuestionDef, StageColor, StageDef, TemplateDef } from "../types";

type Row<K extends "projects" | "stages" | "projectQuestions" | "messageTemplates"> = (typeof tables)[K]["$inferSelect"];

export function toDef(r: Row<"projects">): ProjectDef {
  return {
    slug: r.slug,
    name: r.name,
    status: r.status === "closed" ? "closed" : "open",
    intro: r.intro,
    calLink: r.calLink,
    videoPrompt: r.videoPrompt,
    prepSeconds: r.prepSeconds,
    maxRecordSeconds: r.maxRecordSeconds,
    retakesAllowed: r.retakesAllowed,
    taskEnabled: r.taskEnabled,
    taskTitle: r.taskTitle,
    taskBody: readTaskContent(r.taskContent),
    taskAllowText: r.taskAllowText,
    taskAllowLink: r.taskAllowLink,
    taskAllowFile: r.taskAllowFile,
    thankYouText: r.thankYouText,
    replyDays: r.replyDays,
    handoffEnabled: r.handoffEnabled,
  };
}

export function toStage(r: Row<"stages">): StageDef {
  return { id: r.id, name: r.name, color: r.color as StageColor, isPositive: r.isPositive, role: r.role };
}

export function toQuestion(r: Row<"projectQuestions">): QuestionDef {
  return { id: r.id, label: r.label, helpText: r.helpText, type: r.type, options: r.options, required: r.required, archived: r.archived };
}

export function toTemplate(r: Row<"messageTemplates">): TemplateDef {
  return {
    id: r.id,
    channel: r.channel,
    name: r.name,
    subject: r.subject,
    body: r.body,
    ...(r.channel === "whatsapp"
      ? { waTemplateName: r.waTemplateName ?? "", waLanguage: r.waLanguage ?? "", waVariables: r.waVariables }
      : {}),
  };
}
