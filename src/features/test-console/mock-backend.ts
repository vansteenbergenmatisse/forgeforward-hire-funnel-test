import { checkDuration } from "./timing";
import type { Channel, CheckId, CheckResult, TestDataCounts, TestRunner } from "./types";
import type { TestDataStore, TestMessenger } from "./services";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type MockBackend = { runner: TestRunner; messenger: TestMessenger; testData: TestDataStore; setSimulateFailure: (v: boolean) => void };

type MockOptions = {
  rng?: () => number;
  wait?: (ms: number) => Promise<void>;
};

export function createMockBackend({ rng = Math.random, wait = sleep }: MockOptions = {}): MockBackend {
  let failing = false;
  const simulateFailure = () => failing;
  const data: TestDataCounts = { rows: 3, files: 4 };

  const passDetail = (id: CheckId): string | undefined => {
    switch (id) {
      case "messages-dry-run":
        return "WhatsApp in link mode: WA keys missing";
      case "retention":
        return "Would delete 2 videos";
      case "backup":
        return "Last backup 3 hours ago";
      case "integrity":
        return "0 missing files";
      case "webhook-repeat":
        return "Second call ignored";
      default:
        return undefined;
    }
  };

  const runner: TestRunner = {
    async runCheck(id): Promise<CheckResult> {
      const ms = checkDuration(id, rng);
      await wait(ms);
      if (id === "backup" && simulateFailure()) {
        return { ok: false, ms, error: "Last backup 31 hours ago. It must be under 26 hours." };
      }
      if (id === "applicant") data.rows += 1;
      if (id === "upload") data.files += 1;
      return { ok: true, ms, detail: passDetail(id) };
    },
  };

  const modes = { email: "api", whatsapp: "link", sms: "api" } as const;

  const messenger: TestMessenger = {
    target: () => ({ email: "matt@forgeforward.com", phone: "+31612345678" }),
    modes: () => ({ ...modes }),
    async send(channel: Channel) {
      await wait(400 + Math.round(rng() * 500));
      if (channel === "sms" && simulateFailure()) {
        return { ok: false, message: "The SMS provider rejected the number. Check TEST_PHONE." };
      }
      if (modes[channel] === "link") return { ok: true, message: "Link mode: the message link was built and opened." };
      return { ok: true, message: "Sent. It should arrive within a minute." };
    },
  };

  const testData: TestDataStore = {
    async counts() {
      return { ...data };
    },
    async deleteAll() {
      await wait(500 + Math.round(rng() * 400));
      data.rows = 0;
      data.files = 0;
      return { ...data };
    },
  };

  return { runner, messenger, testData, setSimulateFailure: (v) => (failing = v) };
}
