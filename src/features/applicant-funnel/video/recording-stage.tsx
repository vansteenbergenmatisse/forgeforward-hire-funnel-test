"use client";

import { useEffect, useRef, useState } from "react";
import type { FunnelProject } from "../types";
import { finishUnlocked, FINISH_UNLOCK_SECONDS } from "./phase";
import { startRecorder, withDuration, type RunningRecorder } from "./recorder";
import { grabThumbnail, shouldGrabThumb } from "./thumbnail";
import { RecordScreen } from "./ui/record-screen";

export type RecordingResult = { blob: Blob; thumb: Blob | null; mime: string; seconds: number; hidden: boolean };

type Props = {
  project: FunnelProject;
  stream: MediaStream | null;
  audioOnly: boolean;
  onEnded: (result: RecordingResult) => void;
};

type WakeLockSentinelLike = { release: () => Promise<void> };

/** Owns one recording: MediaRecorder, timer, thumbnail, wake lock and the hidden-tab rule. */
export function RecordingStage({ project, stream, audioOnly, onEnded }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishRef = useRef<(() => void) | null>(null);
  const endedRef = useRef(onEnded);
  useEffect(() => {
    endedRef.current = onEnded;
  });

  useEffect(() => {
    if (!stream) return;
    let cancelled = false;
    let finished = false;
    let thumb: Blob | null = null;
    let thumbRequested = false;
    let recorder: RunningRecorder | null = null;
    let wakeLock: WakeLockSentinelLike | null = null;
    const startedAt = performance.now();

    const finish = async (hidden: boolean) => {
      if (finished || !recorder) return;
      finished = true;
      clearInterval(timer);
      const ms = performance.now() - startedAt;
      const done = await recorder.stop();
      if (cancelled) return;
      const blob = await withDuration(done.blob, done.mime, ms);
      if (cancelled) return;
      endedRef.current({ blob, thumb, mime: done.mime, seconds: ms / 1000, hidden });
    };

    try {
      recorder = startRecorder(stream, audioOnly);
    } catch {
      endedRef.current({ blob: new Blob([]), thumb: null, mime: "", seconds: 0, hidden: true });
      return;
    }

    const wake = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } }).wakeLock;
    if (wake) {
      wake.request("screen").then((l) => (wakeLock = l)).catch(() => {});
    }

    const timer = setInterval(() => {
      const ms = performance.now() - startedAt;
      setElapsed(ms / 1000);
      if (!audioOnly && videoRef.current && !thumbRequested && shouldGrabThumb(ms, false)) {
        thumbRequested = true;
        void grabThumbnail(videoRef.current).then((t) => (thumb = t));
      }
      if (ms >= project.maxRecordSeconds * 1000) void finish(false);
    }, 250);

    const onVisibility = () => {
      if (document.hidden) void finish(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    finishRef.current = () => void finish(false);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      finishRef.current = null;
      if (!finished) void recorder?.stop();
      void wakeLock?.release().catch(() => {});
    };
  }, [stream, audioOnly, project.maxRecordSeconds]);

  const unlockIn = finishUnlocked(elapsed) ? 0 : Math.ceil(FINISH_UNLOCK_SECONDS - elapsed);
  return (
    <RecordScreen
      prompt={project.videoPrompt}
      stream={stream}
      audioOnly={audioOnly}
      elapsed={elapsed}
      max={project.maxRecordSeconds}
      unlockIn={unlockIn}
      onFinish={() => finishRef.current?.()}
      videoRef={videoRef}
    />
  );
}
