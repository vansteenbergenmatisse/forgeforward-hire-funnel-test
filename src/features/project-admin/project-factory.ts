import { BLANK_PROJECT_DEF, DEFAULT_STAGES, DEFAULT_TEMPLATE, slugify, uniqueSlug, type StageColor, type StageDef, type TemplateDef } from "@/features/projects";
import type { ProjectRecord } from "./types";

function defaultStages(slug: string): StageDef[] {
  return DEFAULT_STAGES.map((s, i) => ({
    id: `st-${slug}-${i + 1}`,
    name: s.name,
    color: s.color as StageColor,
    isPositive: s.isPositive,
    role: s.role,
  }));
}

function defaultTemplates(slug: string): TemplateDef[] {
  return (["email", "sms", "whatsapp"] as const).map((channel) => ({
    id: `tpl-${slug}-${channel}`,
    channel,
    name: DEFAULT_TEMPLATE.name,
    subject: channel === "email" ? DEFAULT_TEMPLATE.subject : "",
    body: DEFAULT_TEMPLATE.body,
    ...(channel === "whatsapp" ? { waTemplateName: "interview_invite", waLanguage: "en", waVariables: ["first_name", "cal_link"] } : {}),
  }));
}

/** Default stages and the fixed fields only. No custom questions. */
export function blankProject(name: string, takenSlugs: string[]): ProjectRecord {
  const slug = uniqueSlug(name, takenSlugs);
  return {
    def: { ...BLANK_PROJECT_DEF, slug, name: name.trim() },
    questions: [],
    stages: defaultStages(slug),
    templates: defaultTemplates(slug),
  };
}

/** Copies questions, video settings, task, stages, templates and thank-you text. Ids are renewed so nothing is shared. */
export function duplicateProject(source: ProjectRecord, name: string, takenSlugs: string[]): ProjectRecord {
  const slug = uniqueSlug(name, takenSlugs);
  return {
    def: { ...source.def, slug, name: name.trim(), status: "open" },
    questions: source.questions.map((q) => ({ ...q, options: [...q.options] })),
    stages: source.stages.map((s, i) => ({ ...s, id: `st-${slug}-${i + 1}` })),
    templates: source.templates.map((t) => ({ ...t, id: `tpl-${slug}-${t.channel}`, ...(t.waVariables ? { waVariables: [...t.waVariables] } : {}) })),
  };
}

export { slugify, uniqueSlug };
