import { expect, it } from "vitest";
import { startedThisWeek } from "./weekly";

it("counts the last 7 days only", () => {
  const now = new Date("2026-10-21T12:00:00Z");
  expect(startedThisWeek(["2026-10-21T10:00:00Z", "2026-10-15T13:00:00Z", "2026-10-14T11:00:00Z", "2026-10-22T10:00:00Z"], now)).toBe(2);
});
