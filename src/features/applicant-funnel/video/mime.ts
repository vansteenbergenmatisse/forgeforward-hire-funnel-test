const VIDEO_ORDER = [
  "video/mp4;codecs=avc1,mp4a",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm",
];
const AUDIO_ORDER = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];

/** First supported recorder mime type in our preference order, or "" to let the browser choose. */
export function pickMime(isSupported: (mime: string) => boolean, audioOnly = false): string {
  const order = audioOnly ? AUDIO_ORDER : VIDEO_ORDER;
  for (const mime of order) {
    try {
      if (isSupported(mime)) return mime;
    } catch {
      // some browsers throw on unknown codecs
    }
  }
  return "";
}

/** Strips codec parameters: "video/webm;codecs=vp9,opus" becomes "video/webm". */
export function baseMime(mime: string): string {
  return mime.split(";")[0] ?? mime;
}

export function extForMime(mime: string): string {
  const base = baseMime(mime);
  if (base.endsWith("mp4")) return base.startsWith("audio") ? "m4a" : "mp4";
  return "webm";
}

export function isWebm(mime: string): boolean {
  return baseMime(mime).endsWith("webm");
}
