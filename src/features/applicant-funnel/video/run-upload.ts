import type { FunnelApi, UploadUrls } from "../types";
import { extForMime } from "./mime";
import { withRetry, type RetryOptions } from "./retry";
import { clearTake, type Take } from "./recording-store";
import { uploadWithProgress } from "./upload";

type Deps = {
  put?: typeof uploadWithProgress;
  retry?: Pick<RetryOptions, "sleep">;
  now?: () => number;
};

/** Upload links live 15 minutes on the server. Reuse them for 10. */
export const URL_REUSE_MS = 10 * 60_000;
type Cached = { urls: UploadUrls; bytes: number; mime: string; withThumb: boolean; at: number };
const issued = new Map<string, Cached>();

/** For tests. */
export function resetIssuedUrls() {
  issued.clear();
}

/**
 * Steps: get signed URLs, PUT video, PUT thumbnail, tell the server, clear IndexedDB.
 * The take is already in IndexedDB (the video flow saves it the moment recording ends).
 * Each network step retries up to 5 times. A thumbnail that never uploads is skipped, the video still counts.
 * Signed URLs are reused for the same take while they are still valid, so a manual "Try again" overwrites the
 * same object instead of leaving a partial one behind.
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
  const now = deps.now ?? Date.now;
  onProgress(0);

  const withThumb = !take.audioOnly && take.thumb !== null;
  const cached = issued.get(resumeToken);
  const reusable =
    cached && cached.bytes === take.blob.size && cached.mime === take.mime && cached.withThumb === withThumb && now() - cached.at < URL_REUSE_MS;
  const urls =
    reusable && cached
      ? cached.urls
      : await withRetry(
          () =>
            api.getUploadUrls({
              resumeToken,
              kind: "video",
              mime: take.mime,
              filename: `video.${extForMime(take.mime)}`,
              withThumb,
              bytes: take.blob.size,
              thumbBytes: withThumb ? take.thumb?.size : undefined,
            }),
          retry,
        );
  issued.set(resumeToken, { urls, bytes: take.blob.size, mime: take.mime, withThumb, at: reusable && cached ? cached.at : now() });

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
  issued.delete(resumeToken);
  await clearTake(resumeToken);
}
