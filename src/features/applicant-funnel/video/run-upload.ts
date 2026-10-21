import type { FunnelApi } from "../types";
import { extForMime } from "./mime";
import { withRetry, type RetryOptions } from "./retry";
import { clearTake, saveTake, type Take } from "./recording-store";
import { uploadWithProgress } from "./upload";

type Deps = {
  put?: typeof uploadWithProgress;
  retry?: Pick<RetryOptions, "sleep">;
};

/**
 * Steps: store in IndexedDB, get signed URLs, PUT video, PUT thumbnail, tell the server, clear IndexedDB.
 * Each network step retries up to 5 times. A thumbnail that never uploads is skipped, the video still counts.
 * Throws when the video cannot be saved. The take stays in IndexedDB.
 */
export async function runUpload(
  api: FunnelApi,
  resumeToken: string,
  take: Take,
  onProgress: (percent: number) => void,
  deps: Deps = {},
): Promise<void> {
  const put = deps.put ?? uploadWithProgress;
  const retry = deps.retry ?? {};
  onProgress(0);
  await saveTake(resumeToken, take);

  const withThumb = !take.audioOnly && take.thumb !== null;
  const urls = await withRetry(
    () =>
      api.getUploadUrls({
        resumeToken,
        kind: "video",
        mime: take.mime,
        filename: `video.${extForMime(take.mime)}`,
        withThumb,
      }),
    retry,
  );

  await withRetry(() => put(urls.putUrl, take.blob, take.mime, (f) => onProgress(Math.round(f * 90))), retry);

  let thumbKey: string | undefined;
  if (withThumb && take.thumb && urls.thumbPutUrl && urls.thumbKey) {
    const thumb = take.thumb;
    const thumbUrl = urls.thumbPutUrl;
    try {
      await withRetry(() => put(thumbUrl, thumb, "image/jpeg", () => {}), retry);
      thumbKey = urls.thumbKey;
    } catch {
      thumbKey = undefined;
    }
  }
  onProgress(95);

  await withRetry(
    () =>
      api.completeVideo({
        resumeToken,
        key: urls.key,
        thumbKey,
        mime: take.mime,
        bytes: take.blob.size,
        seconds: Math.round(take.seconds),
        audioOnly: take.audioOnly,
        retakeUsed: take.retakeUsed,
      }),
    retry,
  );
  onProgress(100);
  await clearTake(resumeToken);
}
