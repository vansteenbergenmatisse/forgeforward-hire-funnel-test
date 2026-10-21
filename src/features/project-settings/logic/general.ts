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

/** Accepts "cal.com/team/event" and full URLs. Returns the https URL, or null when it is not a Cal.com style link. */
export function normalizeCalLink(raw: string): string | null {
  const v = raw.trim();
  if (v === "") return null;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    if (url.pathname.replace(/\//g, "") === "") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function validateCalLink(raw: string): string | null {
  if (raw.trim() === "") return "Add your Cal.com event link. Interview invites use it.";
  return normalizeCalLink(raw) ? null : "Use a full event link, like cal.com/forgeforward/interview.";
}
