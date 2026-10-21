"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listCameras, requestMedia, stopStream, type CaptureResult } from "./capture";

/** Owns the camera/mic stream and the mic level. Stops every track on unmount. */
export function useCapture() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
  }, []);

  const request = useCallback(async (deviceId?: string): Promise<CaptureResult> => {
    if (deviceId) stopStream(streamRef.current); // some phones cannot open two cameras at once
    const result = await requestMedia(deviceId);
    if (!aliveRef.current) {
      if (result.ok) stopStream(result.stream);
      return result;
    }
    if (result.ok) {
      stopStream(streamRef.current);
      streamRef.current = result.stream;
      setStream(result.stream);
      setCameras(await listCameras());
    }
    return result;
  }, []);

  useEffect(() => {
    const audioTrack = stream?.getAudioTracks()[0];
    if (!stream || !audioTrack) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    let ctx: AudioContext | null = null;
    let raf = 0;
    let last = 0;
    try {
      ctx = new Ctx();
      const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        if (now - last < 50) return;
        last = now;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
      };
      raf = requestAnimationFrame(tick);
    } catch {
      // meter is a nice-to-have
    }
    return () => {
      cancelAnimationFrame(raf);
      void ctx?.close().catch(() => {});
    };
  }, [stream]);

  return { stream, cameras, level: stream ? level : 0, request, stop };
}
