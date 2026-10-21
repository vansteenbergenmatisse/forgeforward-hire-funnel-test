export type CheckResult = {
  ok: boolean;
  ms: number;
  error?: string;
  /** Short note shown under the check name on pass (for example "Would delete 2 videos"). */
  detail?: string;
};

/** The seam between the console and the stack. A mock runner now, an HTTP runner later. */
export interface TestRunner {
  runCheck(id: CheckId): Promise<CheckResult>;
}

export const CHECK_IDS = [
  "db",
  "r2",
  "applicant",
  "upload",
  "video-complete",
  "task",
  "stage-drag",
  "webhook",
  "webhook-repeat",
  "messages-dry-run",
  "retention",
  "backup",
  "integrity",
] as const;

export type CheckId = (typeof CHECK_IDS)[number];

export type CheckDef = { id: CheckId; label: string };

export type RowStatus = "idle" | "running" | "pass" | "fail";

export type CheckRow = {
  id: CheckId;
  label: string;
  status: RowStatus;
  ms?: number;
  error?: string;
  detail?: string;
};

export type Channel = "email" | "whatsapp" | "sms";

export type ChannelMode = "api" | "link";

export type SendResult = { ok: boolean; message: string };

export type TestDataCounts = { rows: number; files: number };
