"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import type { VideoFlowProps } from "../types";
import { recorderSupported } from "./recorder";
import { detectDevice } from "./device";
import { DebugView } from "./debug-view";
import { canOfferHandoff, initialPhaseState, phaseReducer, retakesLeft } from "./phase";
import { CountdownStage, PrepStage } from "./prep-stage";
import { RecordingStage, type RecordingResult } from "./recording-stage";
import type { Take } from "./recording-store";
import { UploadStage } from "./upload-stage";
import { useCapture } from "./use-capture";
import { DeniedScreen, HandoffScreen, MessageScreen } from "./ui/denied-screens";
import { IntroScreen, WorksScreen } from "./ui/check-screens";
import { ReviewScreen } from "./ui/review-screen";
import { UploadFailedScreen } from "./ui/upload-screens";

/** The funnel video step: camera check, prep, record, review, upload. */
export function VideoFlow(props: VideoFlowProps) {
  if (props.debugState) return <DebugView state={props.debugState} project={props.project} />;
  return <LiveFlow {...props} />;
}

type TakeDraft = Omit<Take, "retakeUsed"> & { url: string };

function LiveFlow({ project, session, api, inAppBrowser, resumeUpload, onUploaded }: VideoFlowProps) {
  const [state, dispatch] = useReducer(phaseReducer, resumeUpload, initialPhaseState);
  const capture = useCapture();
  const [take, setTake] = useState<TakeDraft | null>(null);
  const [copied, setCopied] = useState(false);
  const { stop: stopCapture } = capture;

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

  const switchCamera = useCallback(async () => {
    const current = capture.stream?.getVideoTracks()[0]?.getSettings().deviceId;
    const idx = capture.cameras.findIndex((c) => c.deviceId === current);
    const next = capture.cameras[(idx + 1) % capture.cameras.length];
    if (next) await start(next.deviceId);
  }, [capture.cameras, capture.stream, start]);

  const getHandoffLink = useCallback(async () => (await api.createHandoff({ resumeToken: session.resumeToken })).url, [api, session.resumeToken]);

  const onRecorded = useCallback((r: RecordingResult) => {
    setTake({ blob: r.blob, thumb: r.thumb, mime: r.mime, seconds: r.seconds, audioOnly: state.audioOnly, url: URL.createObjectURL(r.blob) });
    dispatch({ type: "RECORDING_ENDED", seconds: r.seconds, bytes: r.blob.size, hidden: r.hidden });
  }, [state.audioOnly]);

  const uploadTake = useMemo<Take | null>(() => {
    if (!take) return null;
    const { url: _url, ...rest } = take;
    void _url;
    return { ...rest, retakeUsed: state.retakesUsed > 0 };
  }, [take, state.retakesUsed]);

  async function copyHere() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
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
              onSwitch={() => void switchCamera()}
              onContinue={() => dispatch({ type: "CONTINUE" })}
            />
          );
        case "denied":
          return <DeniedScreen device={detectDevice(navigator.userAgent)} onRetry={() => void start()} />;
        case "noMic":
          return <MessageScreen icon="mic" title="We need a microphone" body="We need a microphone to continue. Plug one in or allow it in your browser, then try again." button="Try again" onClick={() => void start()} />;
        case "noRecorder":
          return <MessageScreen title="Your browser is too old" body="Your browser is too old for the video step. Open this link in Chrome or Safari." button={copied ? "Link copied" : "Copy link"} done={copied} onClick={() => void copyHere()} />;
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
