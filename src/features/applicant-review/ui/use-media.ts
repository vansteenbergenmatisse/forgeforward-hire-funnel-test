"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MediaKind = "video" | "audio";

/** State and commands for one native media element. */
export function useMedia(src: string, fallbackSeconds: number, kind: MediaKind) {
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(fallbackSeconds);
  const [rate, setRateState] = useState(1);
  const [muted, setMuted] = useState(false);
  const [failed, setFailed] = useState(false);

  // Browser cannot play this type: show the download fallback.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const types = kind === "video" ? ["video/mp4", "video/webm"] : ["audio/mp4", "audio/x-m4a", "audio/aac", "audio/webm"];
    if (el.canPlayType && types.every((t) => el.canPlayType(t) === "")) setFailed(true);
  }, [kind, src]);

  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setFailed(true));
    else el.pause();
  }, []);

  const seek = useCallback((t: number) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = t;
    setTime(t);
  }, []);

  const setRate = useCallback((r: number) => {
    const el = ref.current;
    if (el) el.playbackRate = r;
    setRateState(r);
  }, []);

  const toggleMute = useCallback(() => {
    const el = ref.current;
    if (el) el.muted = !el.muted;
    setMuted((m) => !m);
  }, []);

  const handlers = {
    onPlay: () => {
      setPlaying(true);
      setStarted(true);
    },
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    onTimeUpdate: () => setTime(ref.current?.currentTime ?? 0),
    onLoadedMetadata: () => {
      const d = ref.current?.duration;
      if (d && Number.isFinite(d)) setDuration(d);
    },
    onError: () => setFailed(true),
  };

  return { ref, playing, started, time, duration, rate, muted, failed, toggle, seek, setRate, toggleMute, handlers };
}
