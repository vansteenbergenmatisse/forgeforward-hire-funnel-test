import { describe, expect, it } from "vitest";
import type { StageDef } from "@/features/projects";
import { findGoodStage, findRejectedStage, nextAfter } from "./triage";

const stage = (id: string, name: string, over: Partial<StageDef> = {}): StageDef => ({ id, name, color: "gray", isPositive: false, role: null, ...over });

const stages = [
  stage("s1", "New", { role: "entry_new" }),
  stage("s2", "Good profile + english, invite interview", { color: "blue" }),
  stage("s3", "Interview booked", { role: "on_booking" }),
  stage("s4", "Rejected", { color: "red" }),
];

describe("triage stages", () => {
  it("finds the good profile stage by name, ignoring case", () => {
    expect(findGoodStage(stages)?.id).toBe("s2");
    expect(findGoodStage([stage("x", "GOOD PROFILE")])?.id).toBe("x");
  });
  it("returns undefined when the project has no good profile stage", () => {
    expect(findGoodStage(stages.filter((s) => s.id !== "s2"))).toBeUndefined();
  });
  it("finds the rejected stage by name, else by red and not kept", () => {
    expect(findRejectedStage(stages)?.id).toBe("s4");
    expect(findRejectedStage([stage("r", "Not a fit", { color: "red" })])?.id).toBe("r");
    expect(findRejectedStage([stage("r", "Hired", { color: "red", isPositive: true })])).toBeUndefined();
  });
});

describe("nextAfter", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
  it("takes the following item", () => expect(nextAfter(list, "a")?.id).toBe("b"));
  it("falls back to the previous item at the end", () => expect(nextAfter(list, "c")?.id).toBe("b"));
  it("is null for a single item or an unknown id", () => {
    expect(nextAfter([{ id: "a" }], "a")).toBeNull();
    expect(nextAfter(list, "zzz")).toBeNull();
  });
});
