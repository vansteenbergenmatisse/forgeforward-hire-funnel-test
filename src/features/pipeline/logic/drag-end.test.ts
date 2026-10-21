import { describe, expect, it } from "vitest";
import { MOCK_STAGES } from "@/features/projects";
import type { ApplicantView } from "@/features/applicants";
import { cardDragId, resolveDrop, stageDropId } from "./drag-end";

const [s1, s2] = MOCK_STAGES;
const list = [{ id: "a", stageId: s1.id }, { id: "b", stageId: s2.id }] as ApplicantView[];

describe("resolveDrop", () => {
  it("moves a card dropped on another column", () => {
    expect(resolveDrop(cardDragId("a"), stageDropId(s2.id), list, MOCK_STAGES)).toEqual({ applicantId: "a", toStageId: s2.id });
  });
  it("uses the column of the card it was dropped on", () => {
    expect(resolveDrop(cardDragId("a"), cardDragId("b"), list, MOCK_STAGES)).toEqual({ applicantId: "a", toStageId: s2.id });
  });
  it("ignores same column, no target and unknown ids", () => {
    expect(resolveDrop(cardDragId("a"), stageDropId(s1.id), list, MOCK_STAGES)).toBeNull();
    expect(resolveDrop(cardDragId("a"), null, list, MOCK_STAGES)).toBeNull();
    expect(resolveDrop(cardDragId("zzz"), stageDropId(s2.id), list, MOCK_STAGES)).toBeNull();
    expect(resolveDrop(cardDragId("a"), stageDropId("nope"), list, MOCK_STAGES)).toBeNull();
  });
});
