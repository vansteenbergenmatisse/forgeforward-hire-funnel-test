import { isWebm, pickMime } from "./mime";

export const VIDEO_BITS_PER_SECOND = 1_200_000;

export type RunningRecorder = {
  mime: string;
  stop: () => Promise<{ blob: Blob; mime: string }>;
};

export function recorderSupported(): boolean {
  return typeof window !== "undefined" && typeof window.MediaRecorder === "function";
}

/**
 * Starts MediaRecorder. `onInterrupt` fires once when the recording stops by itself: a recorder error,
 * the recorder going inactive, or a camera or mic track ending (a call, an app switch, a lost device).
 * It never fires after our own stop().
 * If the browser rejects the options (mime or bitrate) it retries with none before giving up.
 */
export function startRecorder(stream: MediaStream, audioOnly: boolean, onInterrupt?: () => void): RunningRecorder {
  const mime = pickMime((m) => MediaRecorder.isTypeSupported(m), audioOnly);
  const options: MediaRecorderOptions = { ...(mime ? { mimeType: mime } : {}), ...(audioOnly ? {} : { videoBitsPerSecond: VIDEO_BITS_PER_SECOND }) };
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, options);
  } catch {
    recorder = new MediaRecorder(stream);
  }
  const chunks: Blob[] = [];
  let stopping = false;
  let interrupted = false;
  const interrupt = () => {
    if (stopping || interrupted) return;
    interrupted = true;
    onInterrupt?.();
  };
  const tracks = stream.getTracks();
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.onerror = interrupt;
  recorder.onstop = interrupt;
  tracks.forEach((t) => t.addEventListener("ended", interrupt));
  recorder.start(1000);
  const finalMime = recorder.mimeType || mime || (audioOnly ? "audio/webm" : "video/webm");
  return {
    mime: finalMime,
    stop: () =>
      new Promise((resolve) => {
        stopping = true;
        tracks.forEach((t) => t.removeEventListener("ended", interrupt));
        const finish = () => resolve({ blob: new Blob(chunks, { type: finalMime }), mime: finalMime });
        if (recorder.state === "inactive") return finish();
        recorder.onstop = finish;
        recorder.stop();
      }),
  };
}

/** Chrome writes webm without a duration. Patch it so the player can seek. */
export async function withDuration(blob: Blob, mime: string, durationMs: number): Promise<Blob> {
  if (!isWebm(mime)) return blob;
  try {
    const fix = (await import("fix-webm-duration")).default;
    return await fix(blob, durationMs, { logger: false });
  } catch {
    return blob;
  }
}
