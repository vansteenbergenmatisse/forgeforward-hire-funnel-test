/** The thumbnail is grabbed about 2 seconds in, or at the end for very short clips. */
export const THUMB_AT_MS = 2000;

export function shouldGrabThumb(elapsedMs: number, alreadyGrabbed: boolean): boolean {
  return !alreadyGrabbed && elapsedMs >= THUMB_AT_MS;
}

/** Draws the current frame of a live preview to a JPG blob. Returns null on any failure. */
export async function grabThumbnail(video: HTMLVideoElement): Promise<Blob | null> {
  try {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;
    const scale = Math.min(1, 640 / w);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  } catch {
    return null;
  }
}
