export type CaptureResult =
  | { ok: true; stream: MediaStream; hasVideo: boolean }
  | { ok: false; kind: "denied" | "noMic"; cameraFailed: boolean; micFailed: boolean };

const isDenied = (e: unknown) => e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");

function videoConstraints(deviceId?: string): MediaTrackConstraints {
  return {
    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }),
    width: { ideal: 1280, max: 1280 },
    height: { ideal: 720, max: 720 },
  };
}

/**
 * Asks for camera and mic. Falls back to mic only when no camera was picked. Never throws.
 * With a `deviceId` (switching cameras) there is no mic-only fallback: the caller keeps the old stream instead.
 */
export async function requestMedia(deviceId?: string): Promise<CaptureResult> {
  const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
  if (!md?.getUserMedia) return { ok: false, kind: "noMic", cameraFailed: true, micFailed: true };
  let denied = false;
  try {
    const stream = await md.getUserMedia({ video: videoConstraints(deviceId), audio: true });
    return { ok: true, stream, hasVideo: true };
  } catch (e) {
    denied = isDenied(e);
  }
  if (deviceId) return { ok: false, kind: denied ? "denied" : "noMic", cameraFailed: true, micFailed: false };
  try {
    const stream = await md.getUserMedia({ audio: true });
    return { ok: true, stream, hasVideo: false };
  } catch (e) {
    denied = denied || isDenied(e);
  }
  return { ok: false, kind: denied ? "denied" : "noMic", cameraFailed: true, micFailed: true };
}

export async function listCameras(): Promise<MediaDeviceInfo[]> {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === "videoinput");
  } catch {
    return [];
  }
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((t) => t.stop());
}
