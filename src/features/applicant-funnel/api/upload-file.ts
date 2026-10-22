import { TASK_FILE_TYPE_MESSAGE, taskFileMime } from "../lib/task-validation";
import type { FunnelApi } from "../types";
import { FunnelApiError } from "./errors";

/** Signed upload for a task file. Mock urls (/__mock-upload/...) are resolved without a network call. */
export async function uploadTaskFile(api: FunnelApi, resumeToken: string, file: File): Promise<string> {
  const mime = taskFileMime(file);
  if (!mime) throw new FunnelApiError(TASK_FILE_TYPE_MESSAGE);
  const urls = await api.getUploadUrls({ resumeToken, kind: "task", mime, filename: file.name, withThumb: false, bytes: file.size });
  if (urls.putUrl.startsWith("/__mock-upload/")) {
    if (urls.putUrl.includes("/fail/")) throw new FunnelApiError("The upload did not finish. Check your connection and try again.", { network: true });
    return urls.key;
  }
  let res: Response;
  try {
    res = await fetch(urls.putUrl, { method: "PUT", body: file, headers: { "Content-Type": mime }, signal: AbortSignal.timeout(120_000) });
  } catch {
    throw new FunnelApiError("The upload did not finish. Check your connection and try again.", { network: true });
  }
  if (!res.ok) throw new FunnelApiError("The upload did not finish. Please try again.", { status: res.status });
  return urls.key;
}
