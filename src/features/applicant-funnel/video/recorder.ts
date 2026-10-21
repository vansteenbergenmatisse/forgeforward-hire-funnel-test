import { isWebm, pickMime } from "./mime";

export const VIDEO_BITS_PER_SECOND = 1_200_000;

export type RunningRecorder = {
  mime: string;
  stop: () => Promise<{ blob: Blob; mime: string }>;
};

export function recorderSupported(): boolean {
  return typeof window !== "undefined" && typeof window.MediaRecorder === "function";
}

export function startRecorder(stream: MediaStream, audioOnly: boolean): RunningRecorder {
  const mime = pickMime((m) => MediaRecorder.isTypeSupported(m), audioOnly);
  const options: MediaRecorderOptions = { ...(mime ? { mimeType: mime } : {}), ...(audioOnly ? {} : { videoBitsPerSecond: VIDEO_BITS_PER_SECOND }) };
  const recorder = new MediaRecorder(stream, options);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start(1000);
  const finalMime = recorder.mimeType || mime || (audioOnly ? "audio/webm" : "video/webm");
  return {
    mime: finalMime,
    stop: () =>
      new Promise((resolve) => {
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
