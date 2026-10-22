"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { VideoFlowProps } from "../types";
import { copyText } from "../lib/copy-text";
import { recorderSupported } from "./recorder";
import { detectDevice } from "./device";
import { DebugView } from "./debug-view";
import { canOfferHandoff, initialPhaseState, MAX_BLOB_BYTES, MIN_SECONDS, phaseReducer, retakesLeft } from "./phase";
import { CountdownStage, PrepStage } from "./prep-stage";
import { RecordingStage, type RecordingResult } from "./recording-stage";
import { clearTake, loadTake, saveTake, type Take } from "./recording-store";
import { UploadStage } from "./upload-stage";
import { useCapture } from "./use-capture";
import { DeniedScreen, HandoffScreen, MessageScreen } from "./ui/denied-screens";
import { IntroScreen, WorksScreen } from "./ui/check-screens";
import { ReviewScreen } from "./ui/review-screen";
import { UploadFailedScreen } from "./ui/upload-screens";

/** The funnel video step: camera check, prep, record, review, upload. */
export function VideoFlow(props: VideoFlowProps) {
  if (props.debugState) return <DebugView state={props.debugState} project={props.project} />;
  return <ResumeGate {...props} />;
}

/**
 * Looks for a recording saved on this device before the camera check starts.
 * If one is there (the tab was closed or discarded mid upload), the flow opens on "Finish saving your video".
 */
function ResumeGate(props: VideoFlowProps) {
  const [saved, setSaved] = useState<boolean | null>(props.resumeUpload ?? null);
  const token = props.session.resumeToken;
  useEffect(() => {
    if (saved !== null) return;
    let alive = true;
    void loadTake(token).then((t) => alive && setSaved(Boolean(t)));
    return () => {
      alive = false;
    };
  }, [saved, token]);
  if (saved === null) return <p className="px-5 py-8 text-muted md:px-0">Loading</p>;
  return <LiveFlow {...props} resumeUpload={saved} />;
}

const WARN_PHASES = new Set(["recording", "review", "upload", "uploadFailed"]);

type TakeDraft = Omit<Take, "retakeUsed"> & { url: string };

function LiveFlow({ project, session, api, inAppBrowser, resumeUpload, onUploaded }: VideoFlowProps) {
  const [state, dispatch] = useReducer(phaseReducer, resumeUpload, initialPhaseState);
  const capture = useCapture(state.phase === "check");
  const [take, setTake] = useState<TakeDraft | null>(null);
  const [copied, setCopied] = useState(false);
  const [switchNotice, setSwitchNotice] = useState<string | null>(null);
  const handoffRef = useRef<{ promise: Promise<{ url: string; expiresAt: string }>; expiresAt: number } | null>(null);
  const { stop: stopCapture } = capture;

  // Closing the tab or going back loses a recording that is not saved yet, so ask first.
  const warn = WARN_PHASES.has(state.phase);
  useEffect(() => {
    if (!warn) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [warn]);

  const left = retakesLeft(state, project.retakesAllowed);

  useEffect(() => {
    if (state.phase === "upload") stopCapture();
  }, [state.phase, stopCapture]);

  useEffect(() => {
    const url = take?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [take]);

  const start = useCallback(
    async (deviceId?: string) => {
      dispatch({ type: "REQUEST" });
      if (!recorderSupported()) return dispatch({ type: "NO_RECORDER" });
      const result = await capture.request(deviceId);
      if (result.ok) return dispatch({ type: "MEDIA_OK", hasVideo: result.hasVideo });
      dispatch({
        type: "MEDIA_FAILED",
        kind: result.kind,
        handoff: canOfferHandoff({ cameraFailed: result.cameraFailed, micFailed: result.micFailed, inAppBrowser, handoffEnabled: project.handoffEnabled }),
      });
    },
    [capture, inAppBrowser, project.handoffEnabled],
  );

  const { switchCamera: switchTo } = capture;
  const switchCamera = useCallback(async () => {
    const current = capture.stream?.getVideoTracks()[0]?.getSettings().deviceId;
    const idx = capture.cameras.findIndex((c) => c.deviceId === current);
    const next = capture.cameras[(idx + 1) % capture.cameras.length];
    if (!next) return;
    setSwitchNotice(null);
    // The working camera stays on until the new one opens. A failed switch keeps the old camera.
    if (!(await switchTo(next.deviceId))) setSwitchNotice("That camera would not open. You are still on the first one.");
  }, [capture.cameras, capture.stream, switchTo]);

  // One link per screen visit: leaving and returning must not invalidate a link the person already copied.
  const getHandoffLink = useCallback(async () => {
    const cached = handoffRef.current;
    if (cached && cached.expiresAt - Date.now() > 60_000) return (await cached.promise).url;
    const promise = api.createHandoff({ resumeToken: session.resumeToken });
    handoffRef.current = { promise, expiresAt: Date.now() + 23 * 60 * 60_000 };
    try {
      const made = await promise;
      const expiresAt = Date.parse(made.expiresAt);
      if (handoffRef.current?.promise === promise && Number.isFinite(expiresAt)) handoffRef.current.expiresAt = expiresAt;
      return made.url;
    } catch (err) {
      if (handoffRef.current?.promise === promise) handoffRef.current = null;
      throw err;
    }
  }, [api, session.resumeToken]);

  const onRecorded = useCallback(
    (r: RecordingResult) => {
      if (r.startFailed) return dispatch({ type: "NO_RECORDER" });
      // A dead camera or mic cannot record again. Go back to the camera check instead of looping on prep.
      if (r.hidden && capture.stream?.getTracks().some((t) => t.readyState === "ended")) {
        stopCapture();
        return dispatch({ type: "RESTART", notice: "Your camera or mic stopped. Turn it on again to keep going." });
      }
      const draft = { blob: r.blob, thumb: r.thumb, mime: r.mime, seconds: r.seconds, audioOnly: state.audioOnly };
      if (!r.hidden && r.blob.size > 0 && r.seconds >= MIN_SECONDS && r.blob.size <= MAX_BLOB_BYTES) {
        // Keep the take on this device from the moment it exists, so a discarded tab can still finish the upload.
        void saveTake(session.resumeToken, { ...draft, retakeUsed: state.retakesUsed > 0 });
      }
      setTake({ ...draft, url: URL.createObjectURL(r.blob) });
      dispatch({ type: "RECORDING_ENDED", seconds: r.seconds, bytes: r.blob.size, hidden: r.hidden });
    },
    [state.audioOnly, state.retakesUsed, capture.stream, stopCapture, session.resumeToken],
  );

  const uploadTake = useMemo<Take | null>(() => {
    if (!take) return null;
    const { url: _url, ...rest } = take;
    void _url;
    return { ...rest, retakeUsed: state.retakesUsed > 0 };
  }, [take, state.retakesUsed]);

  async function copyHere() {
    setCopied(await copyText(window.location.href));
  }

  const common = { stream: capture.stream, audioOnly: state.audioOnly };

  switch (state.phase) {
    case "check":
      switch (state.step) {
        case "intro":
        case "requesting":
          return <IntroScreen seconds={project.maxRecordSeconds} loading={state.step === "requesting"} notice={state.notice} onStart={() => void start()} />;
        case "works":
        case "audioOnly":
          return (
            <WorksScreen
              {...common}
              level={capture.level}
              canSwitch={!state.audioOnly && capture.cameras.length > 1}
              notice={switchNotice}
              onSwitch={() => void switchCamera()}
              onContinue={() => dispatch({ type: "CONTINUE" })}
            />
          );
        case "denied":
          return <DeniedScreen device={detectDevice(navigator.userAgent, navigator.maxTouchPoints)} onRetry={() => void start()} />;
        case "noMic":
          return <MessageScreen icon="mic" title="We need a microphone" body="We need a microphone to continue. Plug one in or allow it in your browser, then try again." button="Try again" onClick={() => void start()} />;
        case "noRecorder":
          return <MessageScreen title="Your browser is too old" body="Your browser is too old for the video step. Open this link in Chrome or Safari." button={copied ? "Link copied" : "Copy link"} done={copied} link={window.location.href} onClick={() => void copyHere()} />;
        case "handoff":
          return <HandoffScreen getLink={getHandoffLink} onTryAgain={() => void start()} />;
      }
      return null;
    case "prep":
      return <PrepStage key={state.prepRound} {...common} prompt={project.videoPrompt} prepSeconds={project.prepSeconds} round={state.prepRound} notice={state.notice} onReady={() => dispatch({ type: "READY" })} />;
    case "countdown":
      return <CountdownStage {...common} onDone={() => dispatch({ type: "COUNTDOWN_DONE" })} />;
    case "recording":
      return <RecordingStage project={project} {...common} onEnded={onRecorded} />;
    case "review":
      return (
        <ReviewScreen
          src={take?.url ?? null}
          audioOnly={state.audioOnly}
          seconds={take?.seconds ?? 0}
          retakesLeft={left}
          onUse={() => dispatch({ type: "USE_VIDEO" })}
          onRetake={() => {
            void clearTake(session.resumeToken);
            setTake(null);
            dispatch({ type: "RETAKE" });
          }}
        />
      );
    case "upload":
      return (
        <UploadStage
          api={api}
          resumeToken={session.resumeToken}
          take={uploadTake}
          resuming={Boolean(resumeUpload) && !take}
          onDone={onUploaded}
          onFailed={() => dispatch({ type: "UPLOAD_FAILED" })}
          onMissing={() => dispatch({ type: "RESTART", notice: "We could not find your saved video. Please record it again." })}
        />
      );
    case "uploadFailed":
      return <UploadFailedScreen onRetry={() => dispatch({ type: "RETRY" })} />;
  }
}
