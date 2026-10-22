import { describe, expect, it } from "vitest";
import type { tables } from "@/platform/db";
import { toApplicantView } from "./map";

type Row = typeof tables.applicants.$inferSelect;

function row(over: Partial<Row>): Row {
  return {
    id: "a1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    booking: null,
    taskFileKey: null,
    taskFileName: null,
    taskFileBytes: null,
    ...over,
  } as Row;
}

describe("toApplicantView task file", () => {
  it("is null when there is no task file", () => {
    expect(toApplicantView(row({}), "p", [], []).taskFile).toBeNull();
  });

  it("shows the stored name and size", () => {
    const v = toApplicantView(row({ taskFileKey: "test/tasks/p/a1/1_cv.pdf", taskFileName: "1_cv.pdf", taskFileBytes: 2048 }), "p", [], []);
    expect(v.taskFile).toMatchObject({ name: "1_cv.pdf", bytes: 2048 });
  });

  it("falls back to the key name and 0 bytes for older rows", () => {
    const v = toApplicantView(row({ taskFileKey: "test/tasks/p/a1/old.pdf" }), "p", [], []);
    expect(v.taskFile).toMatchObject({ name: "old.pdf", bytes: 0 });
  });
});
