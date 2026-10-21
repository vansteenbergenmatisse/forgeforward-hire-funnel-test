import { describe, expect, it } from "vitest";
import { MOCK_STAGES } from "@/features/projects";
import { addStage, assignRole, checkDeleteStage, deleteStage, uniqueStageName, validateStageName } from "./stages";

const roleHolders = (s: typeof MOCK_STAGES) => s.filter((x) => x.role).map((x) => x.role).sort();

describe("assignRole", () => {
  it("moves a role to a stage without a role", () => {
    const next = assignRole(MOCK_STAGES, "st-trial", "on_booking");
    expect(next.find((s) => s.id === "st-trial")?.role).toBe("on_booking");
    expect(next.find((s) => s.id === "st-booked")?.role).toBeNull();
  });
  it("swaps when the target already holds a role", () => {
    const next = assignRole(MOCK_STAGES, "st-task", "entry_new");
    expect(next.find((s) => s.id === "st-task")?.role).toBe("entry_new");
    expect(next.find((s) => s.id === "st-new")?.role).toBe("entry_task");
  });
  it("keeps every role on exactly one stage", () => {
    const next = assignRole(assignRole(MOCK_STAGES, "st-hired", "entry_task"), "st-trial", "entry_task");
    expect(roleHolders(next)).toEqual(["entry_new", "entry_task", "on_booking"]);
  });
  it("refuses to clear a role", () => expect(assignRole(MOCK_STAGES, "st-new", null)).toEqual(MOCK_STAGES));
});

describe("delete rules", () => {
  it("blocks deleting a stage that holds a role and says why", () => {
    const c = checkDeleteStage(MOCK_STAGES, "st-new", 9);
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.message).toMatch(/role/);
  });
  it("allows deleting a roleless stage and reports its cards", () => {
    expect(checkDeleteStage(MOCK_STAGES, "st-trial", 1)).toEqual({ ok: true, cards: 1 });
  });
  it("needs a valid target when cards sit in the stage", () => {
    expect(deleteStage(MOCK_STAGES, "st-trial", 1)).toBeNull();
    expect(deleteStage(MOCK_STAGES, "st-trial", 1, "st-trial")).toBeNull();
    expect(deleteStage(MOCK_STAGES, "st-trial", 1, "st-hired")?.length).toBe(6);
  });
  it("deletes an empty stage without a target", () => expect(deleteStage(MOCK_STAGES, "st-trial", 0)?.length).toBe(6));
  it("never deletes the last stage", () => {
    expect(checkDeleteStage([{ ...MOCK_STAGES[6] }], "st-rejected", 0).ok).toBe(false);
  });
});

describe("names and adding", () => {
  it("makes unique names", () => {
    expect(uniqueStageName(MOCK_STAGES)).toBe("New stage");
    expect(uniqueStageName(addStage(MOCK_STAGES, "x"))).toBe("New stage 2");
  });
  it("validates names", () => {
    expect(validateStageName(MOCK_STAGES, "st-trial", " ")).not.toBeNull();
    expect(validateStageName(MOCK_STAGES, "st-trial", "hired")).toMatch(/already/);
    expect(validateStageName(MOCK_STAGES, "st-trial", "Trial")).toBeNull();
  });
  it("adds a roleless gray non-positive stage at the end", () => {
    const next = addStage(MOCK_STAGES, "n1");
    expect(next.at(-1)).toMatchObject({ id: "n1", color: "gray", isPositive: false, role: null });
  });
});
