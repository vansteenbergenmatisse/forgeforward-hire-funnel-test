export function listTimeZones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    const zones = fn?.("timeZone");
    if (zones?.length) return zones.includes("UTC") ? zones : [...zones, "UTC"];
  } catch {
    /* fall through */
  }
  return ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Amsterdam", "Asia/Dubai", "Asia/Kolkata", "Australia/Sydney"];
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** "Eastern Time (New York)". Falls back to the zone id when Intl cannot name it. */
export function formatZone(zone: string): string {
  const city = (zone.split("/").pop() ?? zone).replaceAll("_", " ");
  try {
    const parts = new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "longGeneric" }).formatToParts(new Date());
    const name = parts.find((p) => p.type === "timeZoneName")?.value;
    if (name && name !== city) return `${name} (${city})`;
  } catch {
    /* fall through */
  }
  return city;
}
