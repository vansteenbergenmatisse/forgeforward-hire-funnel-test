/** "9:42 pm" in the applicant's IANA time zone. Falls back to an empty string for an unknown zone. */
export function localTime(timezone: string, now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("hour")}:${get("minute")} ${get("dayPeriod").toLowerCase()}`;
  } catch {
    return "";
  }
}

/** "9:42 pm their time" for cards. */
export function localTimeLabel(timezone: string, now: Date = new Date()): string {
  const t = localTime(timezone, now);
  return t ? `${t} their time` : "";
}
