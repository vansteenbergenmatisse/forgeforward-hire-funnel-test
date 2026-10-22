export type StageColor = "gray" | "blue" | "amber" | "purple" | "teal" | "green" | "red";
export type StageRole = "entry_new" | "entry_task" | "on_booking" | null;

export type StageDef = {
  id: string;
  name: string;
  color: StageColor;
  isPositive: boolean;
  role: StageRole;
};

export type QuestionType = "short_text" | "long_text" | "number" | "single_choice" | "multi_choice" | "yes_no";

export type QuestionDef = {
  id: string;
  label: string;
  helpText: string;
  type: QuestionType;
  options: string[];
  required: boolean;
  archived: boolean;
};

export type Channel = "email" | "sms" | "whatsapp";

export type TemplateDef = {
  id: string;
  channel: Channel;
  name: string;
  subject: string;
  body: string;
  waTemplateName?: string;
  waLanguage?: string;
  waVariables?: string[];
};

export type ProjectDef = {
  slug: string;
  name: string;
  status: "open" | "closed";
  intro: string;
  calLink: string;
  videoPrompt: string;
  prepSeconds: number;
  maxRecordSeconds: number;
  retakesAllowed: number;
  taskEnabled: boolean;
  taskTitle: string;
  taskBody: string;
  taskAllowText: boolean;
  taskAllowLink: boolean;
  taskAllowFile: boolean;
  thankYouText: string;
  replyDays: number;
  handoffEnabled: boolean;
};

/** A project with everything a duplicate copies. */
export type ProjectBundle = {
  def: ProjectDef;
  questions: QuestionDef[];
  stages: StageDef[];
  templates: TemplateDef[];
};

/** What the admin API returns for a project: the bundle plus how many applicants sit in each stage. */
export type ProjectRecordDto = ProjectBundle & { stageCounts: Record<string, number> };
