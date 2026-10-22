import { extractVariables } from "./templates";

export const THANK_YOU_VARIABLES = ["first_name", "reply_days"] as const;

export function validateThankYou(text: string): string | null {
  if (text.trim() === "") return "Write the message applicants see after they finish.";
  const bad = extractVariables(text).filter((v) => !(THANK_YOU_VARIABLES as readonly string[]).includes(v));
  if (bad.length) return `Unknown variable ${bad.map((b) => `{${b}}`).join(", ")}. Use {first_name} or {reply_days}.`;
  return null;
}

export function renderThankYou(text: string, firstName: string, replyDays: number): string {
  return text.replace(/\{first_name\}/g, () => firstName).replace(/\{reply_days\}/g, () => String(replyDays));
}

/** The first sentence becomes the heading (without its full stop). The rest is the body. */
export function splitThankYou(rendered: string): { heading: string; body: string } {
  const trimmed = rendered.trim();
  const m = trimmed.match(/^(.+?[.!?])(\s+|$)([\s\S]*)$/);
  if (!m) return { heading: trimmed, body: "" };
  return { heading: m[1].replace(/\.$/, ""), body: m[3].trim() };
}
