import type { FunnelApi } from "../types";
import { FunnelApiError } from "./errors";

/** Signed upload for a task file. Mock urls (/__mock-upload/...) are resolved without a network call. */
export async function uploadTaskFile(api: FunnelApi, resumeToken: string, file: File): Promise<string> {
  const urls = await api.getUploadUrls({ resumeToken, kind: "task", mime: file.type || "application/octet-stream", filename: file.name, withThumb: false });
  if (urls.putUrl.startsWith("/__mock-upload/")) {
    if (urls.putUrl.includes("/fail/")) throw new FunnelApiError("The upload did not finish. Check your connection and try again.", { network: true });
    return urls.key;
  }
  let res: Response;
  try {
    res = await fetch(urls.putUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
  } catch {
    throw new FunnelApiError("The upload did not finish. Check your connection and try again.", { network: true });
  }
  if (!res.ok) throw new FunnelApiError("The upload did not finish. Please try again.", { status: res.status });
  return urls.key;
}
