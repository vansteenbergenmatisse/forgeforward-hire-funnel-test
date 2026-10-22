import { normalizeCalLink } from "@/features/projects";

export { normalizeCalLink };

export const REPLY_DAYS = { min: 1, max: 30 } as const;

export function validateProjectName(name: string): string | null {
  const v = name.trim();
  if (v === "") return "Add a role name. Applicants see it on the first screen.";
  if (v.length > 60) return "Use 60 characters or fewer.";
  return null;
}

export function validateReplyDays(raw: string): string | null {
  if (raw.trim() === "") return "Add a number of days.";
  const n = Number(raw);
  if (!Number.isInteger(n)) return "Use a whole number of days.";
  if (n < REPLY_DAYS.min || n > REPLY_DAYS.max) return `Use a number from ${REPLY_DAYS.min} to ${REPLY_DAYS.max}.`;
  return null;
}

export function validateCalLink(raw: string): string | null {
  if (raw.trim() === "") return "Add your Cal.com event link. Interview invites use it.";
  return normalizeCalLink(raw) ? null : "Use a Cal.com event link, like cal.com/forgeforward/interview.";
}
