import type { FunnelApi, FunnelSession, StartPayload } from "../types";
import { FunnelApiError, NETWORK_MESSAGE, SERVER_MESSAGE } from "./errors";

export type MockSim = "server-error" | "slow" | "fail-upload" | null;

export function parseSim(value: string | string[] | undefined | null): MockSim {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "server-error" || v === "slow" || v === "fail-upload" ? v : null;
}

type Counters = { applicants: number; tasks: number; skips: number; videos: number };

declare global {
  interface Window {
    __funnelMock?: Counters;
  }
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const rid = () => Math.random().toString(36).slice(2, 12);

/** In-memory FunnelApi. Dev only: counters are exposed on window.__funnelMock so tests can check "one write". */
// Shared by every instance so React StrictMode double-creation cannot split the counts.
const counters: Counters = { applicants: 0, tasks: 0, skips: 0, videos: 0 };
const sessions = new Map<string, FunnelSession>();
const seen = new Map<string, unknown>();

export function createMockApi(sim: MockSim = null): FunnelApi {
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") window.__funnelMock = counters;
  const delay = () => wait(sim === "slow" ? 3000 : 350);

  async function once<T>(key: string, run: () => T): Promise<T> {
    if (seen.has(key)) return seen.get(key) as T;
    const out = run();
    seen.set(key, out);
    return out;
  }

  return {
    async start(input: StartPayload, idempotencyKey) {
      await delay();
      if (sim === "server-error") throw new FunnelApiError(SERVER_MESSAGE, { status: 500 });
      if (typeof navigator !== "undefined" && navigator.onLine === false) throw new FunnelApiError(NETWORK_MESSAGE, { network: true });
      if (input.website) return { applicantId: `fake-${rid()}`, resumeToken: `fake-${rid()}` }; // honeypot: fake success
      return once(`start:${idempotencyKey}`, () => {
        counters.applicants += 1;
        const session = { applicantId: `ap-${rid()}`, resumeToken: `rt-${rid()}` };
        sessions.set(session.resumeToken, session);
        return session;
      });
    },
    async getUploadUrls({ kind }) {
      await wait(150);
      const base = sim === "fail-upload" ? "/__mock-upload/fail" : "/__mock-upload/ok";
      const id = rid();
      return {
        key: `mock/${kind}/${id}`,
        putUrl: `${base}/${id}`,
        thumbKey: kind === "video" ? `mock/${kind}/${id}.jpg` : undefined,
        thumbPutUrl: kind === "video" ? `${base}/${id}-thumb` : undefined,
      };
    },
    async completeVideo() {
      await delay();
      if (sim === "server-error") throw new FunnelApiError(SERVER_MESSAGE, { status: 500 });
      counters.videos += 1;
    },
    async submitTask(args, idempotencyKey) {
      await delay();
      if (sim === "server-error") throw new FunnelApiError(SERVER_MESSAGE, { status: 500 });
      return once(`task:${idempotencyKey}`, () => {
        if (args.skip) counters.skips += 1;
        else counters.tasks += 1;
        return { stage: args.skip ? ("entry_new" as const) : ("entry_task" as const) };
      });
    },
    async createHandoff() {
      await wait(150);
      return { url: `${typeof window !== "undefined" ? window.location.origin : ""}/a/handoff/${rid()}`, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() };
    },
    async log() {
      /* no-op */
    },
  };
}
