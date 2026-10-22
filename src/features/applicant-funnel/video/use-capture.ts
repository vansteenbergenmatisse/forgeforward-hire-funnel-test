"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listCameras, requestMedia, stopStream, type CaptureResult } from "./capture";

/**
 * Owns the camera/mic stream and the mic level. Stops every track on unmount.
 * The level meter only runs while `meter` is true (the camera check), so recording does not re-render 20 times a second.
 */
export function useCapture(meter = true) {
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

  /**
   * Switches to another camera. The working stream stays until the new one opens.
   * Some phones cannot open two cameras at once, so after a first failure the old one is released and the new one tried again.
   * If that fails too, the previous camera comes back and false is returned.
   */
  const switchCamera = useCallback(async (deviceId: string): Promise<boolean> => {
    const previous = streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId;
    let result = await requestMedia(deviceId);
    if (!result.ok) {
      stopStream(streamRef.current);
      result = await requestMedia(deviceId);
    }
    if (!result.ok) {
      const back = await requestMedia(previous);
      if (back.ok && aliveRef.current) {
        streamRef.current = back.stream;
        setStream(back.stream);
      } else if (back.ok) {
        stopStream(back.stream);
      } else {
        streamRef.current = null;
        setStream(null);
      }
      return false;
    }
    if (!aliveRef.current) {
      stopStream(result.stream);
      return false;
    }
    stopStream(streamRef.current);
    streamRef.current = result.stream;
    setStream(result.stream);
    return true;
  }, []);

  useEffect(() => {
    const audioTrack = stream?.getAudioTracks()[0];
    if (!meter || !stream || !audioTrack) return;
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
  }, [stream, meter]);

  return { stream, cameras, level: stream && meter ? level : 0, request, switchCamera, stop };
}
