import { APPOINTMENT_SETTER, DEFAULT_TEMPLATE, DEFAULT_THANK_YOU } from "./defaults";
import type { Channel, ProjectDef, QuestionDef, StageDef, TemplateDef } from "./types";

/** Front-end fixtures. Replaced by API data when the backend is wired in. */
export const MOCK_PROJECT: ProjectDef = {
  slug: APPOINTMENT_SETTER.slug,
  name: APPOINTMENT_SETTER.name,
  status: "open",
  intro: APPOINTMENT_SETTER.intro,
  calLink: "https://cal.com/forgeforward/interview",
  videoPrompt: APPOINTMENT_SETTER.videoPrompt,
  prepSeconds: 60,
  maxRecordSeconds: 60,
  retakesAllowed: 1,
  taskEnabled: true,
  taskTitle: APPOINTMENT_SETTER.taskTitle,
  taskBody: APPOINTMENT_SETTER.taskText,
  taskAllowText: true,
  taskAllowLink: true,
  taskAllowFile: false,
  thankYouText: DEFAULT_THANK_YOU,
  replyDays: 5,
  handoffEnabled: true,
};

export const MOCK_STAGES: StageDef[] = [
  { id: "st-new", name: "New", color: "gray", isPositive: false, role: "entry_new" },
  { id: "st-task", name: "Did task", color: "blue", isPositive: false, role: "entry_task" },
  { id: "st-booked", name: "Interview booked", color: "amber", isPositive: true, role: "on_booking" },
  { id: "st-interviewed", name: "Interviewed", color: "purple", isPositive: true, role: null },
  { id: "st-trial", name: "Trial", color: "teal", isPositive: true, role: null },
  { id: "st-hired", name: "Hired", color: "green", isPositive: true, role: null },
  { id: "st-rejected", name: "Rejected", color: "red", isPositive: false, role: null },
];

export const MOCK_QUESTIONS: QuestionDef[] = [
  {
    id: "q-years",
    label: APPOINTMENT_SETTER.question.label,
    helpText: "",
    type: "single_choice",
    options: [...APPOINTMENT_SETTER.question.options],
    required: true,
    archived: false,
  },
];

const channels: Channel[] = ["email", "sms", "whatsapp"];

export const MOCK_TEMPLATES: TemplateDef[] = channels.map((channel) => ({
  id: `tpl-${channel}`,
  channel,
  name: DEFAULT_TEMPLATE.name,
  subject: channel === "email" ? DEFAULT_TEMPLATE.subject : "",
  body: DEFAULT_TEMPLATE.body,
  ...(channel === "whatsapp" ? { waTemplateName: "interview_invite", waLanguage: "en", waVariables: ["first_name", "cal_link"] } : {}),
}));
