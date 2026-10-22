import { describe, expect, it } from "vitest";
import {
  canOfferHandoff,
  finishUnlocked,
  initialPhaseState,
  NOTICE_BIG,
  NOTICE_HIDDEN,
  NOTICE_SHORT,
  phaseReducer,
  retakesLeft,
  type PhaseEvent,
  type PhaseState,
} from "./phase";

const run = (events: PhaseEvent[], from: PhaseState = initialPhaseState()) => events.reduce(phaseReducer, from);
const toRecording: PhaseEvent[] = [
  { type: "REQUEST" },
  { type: "MEDIA_OK", hasVideo: true },
  { type: "CONTINUE" },
  { type: "READY" },
  { type: "COUNTDOWN_DONE" },
];

describe("phaseReducer", () => {
  it("walks the happy path", () => {
    const s = run([...toRecording, { type: "RECORDING_ENDED", seconds: 30, bytes: 1000, hidden: false }, { type: "USE_VIDEO" }]);
    expect(s.phase).toBe("upload");
    expect(s.retakesUsed).toBe(0);
  });
  it("falls back to audio only when there is no video", () => {
    const s = run([{ type: "REQUEST" }, { type: "MEDIA_OK", hasVideo: false }]);
    expect(s).toMatchObject({ phase: "check", step: "audioOnly", audioOnly: true });
  });
  it("shows denied, no mic and handoff steps", () => {
    expect(run([{ type: "MEDIA_FAILED", kind: "denied", handoff: false }]).step).toBe("denied");
    expect(run([{ type: "MEDIA_FAILED", kind: "noMic", handoff: false }]).step).toBe("noMic");
    expect(run([{ type: "MEDIA_FAILED", kind: "denied", handoff: true }]).step).toBe("handoff");
    expect(run([{ type: "NO_RECORDER" }]).step).toBe("noRecorder");
  });
  it("does not continue from a denied step", () => {
    const s = run([{ type: "MEDIA_FAILED", kind: "denied", handoff: false }, { type: "CONTINUE" }]);
    expect(s.phase).toBe("check");
  });
  it("a short recording goes back to prep without using the retake", () => {
    const s = run([...toRecording, { type: "RECORDING_ENDED", seconds: 3, bytes: 10, hidden: false }]);
    expect(s).toMatchObject({ phase: "prep", notice: NOTICE_SHORT, retakesUsed: 0, prepRound: 2 });
  });
  it("a hidden tab goes back to prep without using the retake", () => {
    const s = run([...toRecording, { type: "RECORDING_ENDED", seconds: 40, bytes: 10, hidden: true }]);
    expect(s).toMatchObject({ phase: "prep", notice: NOTICE_HIDDEN, retakesUsed: 0 });
  });
  it("an empty recording goes back to prep without using the retake", () => {
    const s = run([...toRecording, { type: "RECORDING_ENDED", seconds: 40, bytes: 0, hidden: false }]);
    expect(s).toMatchObject({ phase: "prep", notice: NOTICE_HIDDEN, retakesUsed: 0 });
  });
  it("a file over 60 MB asks to record again without using the retake", () => {
    const s = run([...toRecording, { type: "RECORDING_ENDED", seconds: 40, bytes: 61 * 1024 * 1024, hidden: false }]);
    expect(s).toMatchObject({ phase: "prep", notice: NOTICE_BIG, retakesUsed: 0 });
  });
  it("retake uses the retake and returns to prep", () => {
    const s = run([...toRecording, { type: "RECORDING_ENDED", seconds: 30, bytes: 1, hidden: false }, { type: "RETAKE" }]);
    expect(s).toMatchObject({ phase: "prep", retakesUsed: 1, notice: null });
    expect(retakesLeft(s, 1)).toBe(0);
  });
  it("upload failure and retry", () => {
    const base = run([...toRecording, { type: "RECORDING_ENDED", seconds: 30, bytes: 1, hidden: false }, { type: "USE_VIDEO" }]);
    const failed = run([{ type: "UPLOAD_FAILED" }], base);
    expect(failed.phase).toBe("uploadFailed");
    expect(run([{ type: "RETRY" }], failed).phase).toBe("upload");
  });
  it("starts in upload when resuming", () => {
    expect(initialPhaseState(true).phase).toBe("upload");
  });
});

describe("helpers", () => {
  it("canOfferHandoff needs all four conditions", () => {
    const all = { cameraFailed: true, micFailed: true, inAppBrowser: true, handoffEnabled: true };
    expect(canOfferHandoff(all)).toBe(true);
    for (const k of Object.keys(all) as (keyof typeof all)[]) expect(canOfferHandoff({ ...all, [k]: false })).toBe(false);
  });
  it("finish unlocks at 10 seconds", () => {
    expect(finishUnlocked(9)).toBe(false);
    expect(finishUnlocked(10)).toBe(true);
  });
});

describe("restart", () => {
  it("returns to the start with a notice", () => {
    const s = phaseReducer(initialPhaseState(true), { type: "RESTART", notice: "x" });
    expect(s).toMatchObject({ phase: "check", step: "intro", notice: "x" });
  });
});
