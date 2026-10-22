import type { TestDataStore, TestMessenger } from "./services";
import type { Channel, ChannelMode, CheckId, CheckResponse, CheckResult, ConsoleState, SendResult, TestDataCounts, TestRunner } from "./types";

export type ConsoleStatus = {
  target: { email: string; phone: string };
  modes: Record<Channel, ChannelMode>;
  counts: TestDataCounts;
};

export type HttpBackend = {
  runner: TestRunner;
  messenger: TestMessenger;
  testData: TestDataStore;
  loadStatus: () => Promise<ConsoleStatus | null>;
};

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

/** The real runner: each check is one call to /api/admin/test/check against the live stack. */
export function createHttpBackend(): HttpBackend {
  let state: ConsoleState = {};
  let status: ConsoleStatus | null = null;

  const runner: TestRunner = {
    async runCheck(id: CheckId): Promise<CheckResult> {
      if (id === "db") state = {};
      const started = performance.now();
      try {
        const out = await json<CheckResponse>("/api/admin/test/check", post({ id, state }));
        state = out.state;
        return out.result;
      } catch (e) {
        const ms = Math.round(performance.now() - started);
        return { ok: false, ms, error: `The test route did not answer (${e instanceof Error ? e.message : "network error"}).` };
      }
    },
  };

  const messenger: TestMessenger = {
    target: () => status?.target ?? { email: "", phone: "" },
    modes: () => status?.modes ?? { email: "link", whatsapp: "link", sms: "link" },
    async send(channel: Channel): Promise<SendResult> {
      try {
        return await json<SendResult>("/api/admin/test/send", post({ channel }));
      } catch {
        return { ok: false, message: "The send route did not answer. Try again." };
      }
    },
  };

  const testData: TestDataStore = {
    async counts() {
      const c = await json<TestDataCounts>("/api/admin/test/data");
      if (status) status = { ...status, counts: c };
      return c;
    },
    deleteAll: () => json<TestDataCounts>("/api/admin/test/data", { method: "DELETE" }),
  };

  return {
    runner,
    messenger,
    testData,
    async loadStatus() {
      try {
        status = await json<ConsoleStatus>("/api/admin/test/status");
      } catch {
        status = null;
      }
      return status;
    },
  };
}
