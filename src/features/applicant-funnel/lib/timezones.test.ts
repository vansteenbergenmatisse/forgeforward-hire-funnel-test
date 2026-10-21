import { describe, expect, it } from "vitest";
import { formatZone, listTimeZones } from "./timezones";

describe("timezones", () => {
  it("lists zones including UTC", () => {
    const zones = listTimeZones();
    expect(zones).toContain("UTC");
    expect(zones).toContain("America/New_York");
  });
  it("formats a readable label", () => {
    expect(formatZone("America/New_York")).toMatch(/New York/);
  });
});
