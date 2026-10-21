import type { CheckDef, CheckRow } from "./types";

/** The 13 checks from the spec, in run order. */
export const CHECKS: CheckDef[] = [
  { id: "db", label: "Database write and read" },
  { id: "r2", label: "R2 put, HEAD and delete" },
  { id: "applicant", label: "Create a test applicant" },
  { id: "upload", label: "Upload a 3 second sample video" },
  { id: "video-complete", label: "Video complete check" },
  { id: "task", label: "Task submit lands on Did task" },
  { id: "stage-drag", label: "Stage drag through the admin API" },
  { id: "webhook", label: "Signed Cal.com webhook moves to Interview booked" },
  { id: "webhook-repeat", label: "Same webhook again does nothing" },
  { id: "messages-dry-run", label: "Email, WhatsApp and SMS dry run" },
  { id: "retention", label: "Retention dry run" },
  { id: "backup", label: "Last backup is under 26 hours old" },
  { id: "integrity", label: "Integrity dry run" },
];

export function idleRows(): CheckRow[] {
  return CHECKS.map((c) => ({ id: c.id, label: c.label, status: "idle" }));
}
