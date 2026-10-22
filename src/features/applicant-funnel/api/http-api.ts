import type { FunnelApi } from "../types";
import { errorFromResponse, FunnelApiError, NETWORK_MESSAGE } from "./errors";

const TIMEOUT_MS = 20_000;

async function call<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new FunnelApiError(NETWORK_MESSAGE, { network: true });
  }
  if (!res.ok) {
    const parsed: unknown = await res.json().catch(() => null);
    throw errorFromResponse(res.status, parsed);
  }
  if (res.status === 204) return undefined as T;
  try {
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  } catch {
    // The body stalled or was cut off after the headers: same as a dropped connection.
    throw new FunnelApiError(NETWORK_MESSAGE, { network: true });
  }
}

type SessionWire = { applicant_id: string; resume_token: string };

/** FunnelApi over the spec routes. Server routes are built separately. */
export function createHttpApi(): FunnelApi {
  return {
    async start(input, key) {
      const r = await call<SessionWire>("/api/apply/start", input, key);
      return { applicantId: r.applicant_id, resumeToken: r.resume_token };
    },
    getUploadUrls: (args) => call("/api/apply/upload-url", args),
    async completeVideo(args) {
      await call("/api/apply/video/complete", args);
    },
    submitTask: (args, key) => call("/api/apply/task", args, key),
    createHandoff: (args) => call("/api/apply/handoff", args),
    async log(event) {
      try {
        await call("/api/apply/log", event);
      } catch {
        /* logging must never break the flow */
      }
    },
  };
}
