export const MIN_SECONDS = 5;
export const FINISH_UNLOCK_SECONDS = 10;
export const MAX_BLOB_BYTES = 60 * 1024 * 1024;

export type CheckStep = "intro" | "requesting" | "works" | "audioOnly" | "denied" | "noMic" | "noRecorder" | "handoff";
export type Phase = "check" | "prep" | "countdown" | "recording" | "review" | "upload" | "uploadFailed";

export type PhaseState = {
  phase: Phase;
  step: CheckStep;
  audioOnly: boolean;
  retakesUsed: number;
  /** Message shown on prep after a recording that did not count. Never uses the retake. */
  notice: string | null;
  /** Bumps every time prep starts, so the prep timer restarts with full time. */
  prepRound: number;
};

export type PhaseEvent =
  | { type: "REQUEST" }
  | { type: "MEDIA_OK"; hasVideo: boolean }
  | { type: "MEDIA_FAILED"; kind: "denied" | "noMic"; handoff: boolean }
  | { type: "NO_RECORDER" }
  | { type: "CONTINUE" }
  | { type: "READY" }
  | { type: "COUNTDOWN_DONE" }
  | { type: "RECORDING_ENDED"; seconds: number; bytes: number; hidden: boolean }
  | { type: "RETAKE" }
  | { type: "USE_VIDEO" }
  | { type: "UPLOAD_FAILED" }
  | { type: "RETRY" }
  | { type: "RESUME" }
  | { type: "RESTART"; notice: string };

export const NOTICE_SHORT = "That was short. Try again.";
export const NOTICE_HIDDEN = "Your recording stopped. Let's try again.";
export const NOTICE_BIG = "That video is too large. Please record it again.";

export function initialPhaseState(resumeUpload = false): PhaseState {
  return {
    phase: resumeUpload ? "upload" : "check",
    step: "intro",
    audioOnly: false,
    retakesUsed: 0,
    notice: null,
    prepRound: 0,
  };
}

export function retakesLeft(state: Pick<PhaseState, "retakesUsed">, allowed: number): number {
  return Math.max(0, allowed - state.retakesUsed);
}

/** The handoff link only shows when camera and mic both fail in an in-app browser and the project allows it. */
export function canOfferHandoff(a: { cameraFailed: boolean; micFailed: boolean; inAppBrowser: boolean; handoffEnabled: boolean }): boolean {
  return a.cameraFailed && a.micFailed && a.inAppBrowser && a.handoffEnabled;
}

export function finishUnlocked(secondsRecorded: number): boolean {
  return secondsRecorded >= FINISH_UNLOCK_SECONDS;
}

const toPrep = (s: PhaseState, notice: string | null, retakesUsed = s.retakesUsed): PhaseState => ({
  ...s,
  phase: "prep",
  notice,
  retakesUsed,
  prepRound: s.prepRound + 1,
});

export function phaseReducer(s: PhaseState, e: PhaseEvent): PhaseState {
  switch (e.type) {
    case "REQUEST":
      return s.phase === "check" ? { ...s, step: "requesting" } : s;
    case "MEDIA_OK":
      return { ...s, phase: "check", step: e.hasVideo ? "works" : "audioOnly", audioOnly: !e.hasVideo };
    case "MEDIA_FAILED":
      return { ...s, phase: "check", step: e.handoff ? "handoff" : e.kind };
    case "NO_RECORDER":
      return { ...s, phase: "check", step: "noRecorder" };
    case "CONTINUE":
      return s.phase === "check" && (s.step === "works" || s.step === "audioOnly") ? toPrep(s, null) : s;
    case "READY":
      return s.phase === "prep" ? { ...s, phase: "countdown" } : s;
    case "COUNTDOWN_DONE":
      return s.phase === "countdown" ? { ...s, phase: "recording", notice: null } : s;
    case "RECORDING_ENDED": {
      if (s.phase !== "recording") return s;
      if (e.hidden || e.bytes <= 0) return toPrep(s, NOTICE_HIDDEN); // an empty file is a recording that stopped
      if (e.seconds < MIN_SECONDS) return toPrep(s, NOTICE_SHORT);
      if (e.bytes > MAX_BLOB_BYTES) return toPrep(s, NOTICE_BIG);
      return { ...s, phase: "review", notice: null };
    }
    case "RETAKE":
      return s.phase === "review" ? toPrep(s, null, s.retakesUsed + 1) : s;
    case "USE_VIDEO":
      return s.phase === "review" ? { ...s, phase: "upload" } : s;
    case "UPLOAD_FAILED":
      return s.phase === "upload" ? { ...s, phase: "uploadFailed" } : s;
    case "RETRY":
      return s.phase === "uploadFailed" ? { ...s, phase: "upload" } : s;
    case "RESUME":
      return { ...s, phase: "upload" };
    case "RESTART":
      return { ...initialPhaseState(), notice: e.notice };
  }
}
