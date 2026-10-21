import type { FunnelApi } from "../types";
import { FunnelApiError, NETWORK_MESSAGE, SERVER_MESSAGE } from "./errors";

async function call<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new FunnelApiError(NETWORK_MESSAGE, { network: true });
  }
  if (!res.ok) throw new FunnelApiError(SERVER_MESSAGE, { status: res.status });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
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
