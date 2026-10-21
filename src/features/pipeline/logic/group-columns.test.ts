import { describe, expect, it } from "vitest";
import { MOCK_STAGES } from "@/features/projects";
import type { ApplicantView } from "@/features/applicants";
import { groupByStage } from "./group-columns";

const card = (id: string, stageId: string | null) => ({ id, stageId }) as ApplicantView;

describe("groupByStage", () => {
  it("returns one column per stage in stage order and keeps card order", () => {
    const cols = groupByStage([card("a", MOCK_STAGES[1].id), card("b", MOCK_STAGES[0].id), card("c", MOCK_STAGES[1].id)], MOCK_STAGES);
    expect(cols.map((c) => c.stage.id)).toEqual(MOCK_STAGES.map((s) => s.id));
    expect(cols[1].cards.map((c) => c.id)).toEqual(["a", "c"]);
    expect(cols[0].cards.map((c) => c.id)).toEqual(["b"]);
  });
  it("drops did-not-finish and unknown-stage cards", () => {
    const cols = groupByStage([card("x", null), card("y", "nope")], MOCK_STAGES);
    expect(cols.every((c) => c.cards.length === 0)).toBe(true);
  });
});
