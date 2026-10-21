import { DEFAULT_STAGES, DEFAULT_TEMPLATE, DEFAULT_THANK_YOU, type ProjectDef, type StageColor, type StageDef, type TemplateDef } from "@/features/projects";
import type { ProjectRecord } from "./types";

export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "project";
}

/** "sales-rep" taken -> "sales-rep-2", then "-3"... */
export function uniqueSlug(name: string, taken: string[]): string {
  const base = slugify(name);
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

const BLANK_DEF: Omit<ProjectDef, "slug" | "name"> = {
  status: "open",
  intro: "",
  calLink: "",
  videoPrompt: "Introduce yourself in 60 seconds. Who are you? Where do you live? Why would you be a great fit?",
  prepSeconds: 60,
  maxRecordSeconds: 60,
  retakesAllowed: 1,
  taskEnabled: false,
  taskTitle: "",
  taskBody: "",
  taskAllowText: true,
  taskAllowLink: true,
  taskAllowFile: false,
  thankYouText: DEFAULT_THANK_YOU,
  replyDays: 5,
  handoffEnabled: true,
};

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
    def: { ...BLANK_DEF, slug, name: name.trim() },
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
