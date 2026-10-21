import { MOCK_PROJECT, MOCK_QUESTIONS, MOCK_STAGES, MOCK_TEMPLATES } from "@/features/projects";
import type { QuestionDef, TemplateDef } from "@/features/projects";
import type { SettingsData } from "./types";

const EXTRA_QUESTIONS: QuestionDef[] = [
  {
    id: "q-hours",
    label: "Which hours can you work?",
    helpText: "",
    type: "multi_choice",
    options: ["Morning", "Afternoon", "Evening"],
    required: false,
    archived: false,
  },
  { id: "q-english", label: "Old question about English level", helpText: "", type: "short_text", options: [], required: false, archived: true },
];

const EXTRA_TEMPLATES: TemplateDef[] = [
  {
    id: "tpl-email-no",
    channel: "email",
    name: "Not a fit (kind no)",
    subject: "Your application with Forge Forward",
    body: "Hi {first_name}, thank you for taking the time to apply for {project_name}. We are not moving forward this time. We wish you the best.",
  },
  {
    id: "tpl-email-trial",
    channel: "email",
    name: "Trial details",
    subject: "Your trial with Forge Forward",
    body: "Hi {first_name}, welcome to the trial. Here is how it works. Book your kickoff here: {cal_link}",
  },
];

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** Fresh copy of the mock settings. Unknown slugs get the same content under their own name. */
export function seedSettings(slug: string): SettingsData {
  const known = slug === MOCK_PROJECT.slug;
  return {
    project: { ...MOCK_PROJECT, slug, name: known ? MOCK_PROJECT.name : titleFromSlug(slug) || slug },
    questions: [...MOCK_QUESTIONS, ...EXTRA_QUESTIONS].map((q) => ({ ...q, options: [...q.options] })),
    stages: MOCK_STAGES.map((s) => ({ ...s })),
    templates: [...MOCK_TEMPLATES, ...EXTRA_TEMPLATES].map((t) => ({ ...t, ...(t.waVariables ? { waVariables: [...t.waVariables] } : {}) })),
  };
}
