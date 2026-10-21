import { describe, expect, it } from "vitest";
import { localTime, localTimeLabel } from "./local-time";

const now = new Date("2026-10-21T15:42:00Z");

describe("local time", () => {
  it("formats in the given zone", () => {
    expect(localTime("Asia/Manila", now)).toBe("11:42 pm");
    expect(localTime("Africa/Johannesburg", now)).toBe("5:42 pm");
    expect(localTime("America/New_York", now)).toBe("11:42 am");
    expect(localTime("America/Chicago", now)).toBe("10:42 am");
  });
  it("adds the label", () => {
    expect(localTimeLabel("Asia/Manila", now)).toBe("11:42 pm their time");
  });
  it("handles midnight and bad zones", () => {
    expect(localTime("UTC", new Date("2026-10-21T00:05:00Z"))).toBe("12:05 am");
    expect(localTimeLabel("Not/AZone", now)).toBe("");
  });
});
