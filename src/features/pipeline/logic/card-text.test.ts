import { describe, expect, it } from "vitest";
import type { QuestionDef } from "@/features/projects";
import type { ApplicantView } from "@/features/applicants";
import { answerColumnTitle, cardAnswerLine, primaryQuestion, progressLabel } from "./card-text";

const q = (over: Partial<QuestionDef>): QuestionDef => ({ id: "q", label: "How many years?", helpText: "", type: "single_choice", options: [], required: true, archived: false, ...over });
const applicant = (value: string) => ({ answers: { q: { label: "x", type: "single_choice", value } } }) as unknown as ApplicantView;

describe("card text", () => {
  it("picks the first active single-choice question", () => {
    const qs = [q({ id: "t", type: "short_text" }), q({ id: "old", archived: true }), q({ id: "ok" })];
    expect(primaryQuestion(qs)?.id).toBe("ok");
    expect(primaryQuestion([])).toBeNull();
  });
  it("adds 'setting' for year questions", () => {
    expect(cardAnswerLine(applicant("3 to 5 years"), q({}))).toBe("3 to 5 years setting");
    expect(cardAnswerLine(applicant("None"), q({}))).toBe("No setting experience");
  });
  it("shows other answers as they are", () => {
    expect(cardAnswerLine(applicant("Evenings"), q({ label: "When can you work?" }))).toBe("Evenings");
    expect(answerColumnTitle(q({ label: "When can you work?" }))).toBe("Main answer");
  });
  it("returns an empty line without an answer", () => {
    expect(cardAnswerLine({ answers: {} } as unknown as ApplicantView, q({}))).toBe("");
  });
  it("labels progress", () => {
    expect(progressLabel({ funnelStep: "form_done", media: null })).toBe("Form only");
    expect(progressLabel({ funnelStep: "video_done", media: null })).toBe("Form + video");
  });
});
