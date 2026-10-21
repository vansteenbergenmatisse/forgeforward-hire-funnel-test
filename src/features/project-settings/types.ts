import type { ProjectDef, QuestionDef, StageDef, TemplateDef } from "@/features/projects";

export const SETTINGS_TABS = [
  { id: "general", label: "General" },
  { id: "questions", label: "Form questions" },
  { id: "video", label: "Video" },
  { id: "task", label: "Task" },
  { id: "stages", label: "Stages" },
  { id: "messages", label: "Messages" },
  { id: "thankyou", label: "Thank-you page" },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

export function parseTab(value: string | string[] | undefined): SettingsTab {
  const v = Array.isArray(value) ? value[0] : value;
  return SETTINGS_TABS.find((t) => t.id === v)?.id ?? "general";
}

/** Everything the settings screens edit for one project. */
export type SettingsData = {
  project: ProjectDef;
  questions: QuestionDef[];
  stages: StageDef[];
  templates: TemplateDef[];
};

export type SettingsSnapshot = { data: SettingsData; savedAt: number | null };
