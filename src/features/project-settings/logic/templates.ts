import { extractVariables, TEMPLATE_VARIABLES, unknownVariables } from "@/features/messaging";
import type { Channel, TemplateDef } from "@/features/projects";

export const CHANNELS: { id: Channel; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "sms", label: "SMS" },
];

export const SAMPLE_APPLICANT: Record<string, string> = {
  first_name: "Sam",
  last_name: "Rivera",
  project_name: "Appointment Setter",
  cal_link: "https://cal.com/forgeforward/interview?name=Sam%20Rivera",
};

export { extractVariables, unknownVariables };

export type TemplateErrors = Partial<Record<"name" | "subject" | "body" | "waTemplateName" | "waLanguage" | "waVariables", string>>;

export function validateTemplate(t: TemplateDef): TemplateErrors {
  const errors: TemplateErrors = {};
  if (t.name.trim() === "") errors.name = "Give the template a name.";
  if (t.channel === "email" && t.subject.trim() === "") errors.subject = "Add a subject for the email.";
  if (t.body.trim() === "") errors.body = "Write the message.";
  const bad = unknownVariables(`${t.subject} ${t.body}`);
  if (!errors.body && bad.length) errors.body = `Unknown variable ${bad.map((b) => `{${b}}`).join(", ")}. Use the chips below.`;
  if (t.channel === "whatsapp") {
    if (!(t.waTemplateName ?? "").trim()) errors.waTemplateName = "Add the template name exactly as Meta approved it.";
    else if (!/^[a-z0-9_]+$/.test(t.waTemplateName ?? "")) errors.waTemplateName = "Meta names use lowercase letters, numbers and underscores.";
    if (!(t.waLanguage ?? "").trim()) errors.waLanguage = "Add a language code, like en or nl.";
    const order = t.waVariables ?? [];
    const known: readonly string[] = TEMPLATE_VARIABLES;
    if (order.some((v) => !known.includes(v))) errors.waVariables = "Use only the four known variables.";
  }
  return errors;
}

/** Variables the sample applicant cannot fill. Shown as a warning because a real send is blocked for them. */
export function variablesWithoutSample(text: string, sample: Record<string, string | undefined>): string[] {
  return extractVariables(text).filter((v) => !sample[v]);
}

/** Inserts `token` into `text` replacing the selection. Returns the new text and caret position. */
export function insertAtCursor(text: string, token: string, start: number, end: number): { text: string; caret: number } {
  const s = Math.max(0, Math.min(start, text.length));
  const e = Math.max(s, Math.min(end, text.length));
  return { text: text.slice(0, s) + token + text.slice(e), caret: s + token.length };
}

/** The WhatsApp variable order defaults to the variables the body uses, in order of first use. */
export function suggestWaVariables(body: string): string[] {
  const known: readonly string[] = TEMPLATE_VARIABLES;
  return extractVariables(body).filter((v) => known.includes(v));
}

/** Fills what it can. `missing` lists variables with no value: a real send is blocked for them. */
export function previewText(text: string, sample: Record<string, string | undefined>): { text: string; missing: string[] } {
  const missing = variablesWithoutSample(text, sample);
  const filled = text.replace(/\{([A-Za-z_]+)\}/g, (m, name: string) => (sample[name] ? (sample[name] as string) : m));
  return { text: filled, missing };
}

export function uniqueTemplateName(templates: readonly TemplateDef[], channel: Channel, base = "New template"): string {
  const taken = new Set(templates.filter((t) => t.channel === channel).map((t) => t.name.trim().toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base} ${i}`.toLowerCase())) return `${base} ${i}`;
}

export function newTemplate(channel: Channel, id: string, existing: readonly TemplateDef[]): TemplateDef {
  return {
    id,
    channel,
    name: uniqueTemplateName(existing, channel),
    subject: "",
    body: "",
    ...(channel === "whatsapp" ? { waTemplateName: "", waLanguage: "en", waVariables: [] } : {}),
  };
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
