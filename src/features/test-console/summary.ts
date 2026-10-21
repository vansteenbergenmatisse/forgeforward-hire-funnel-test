import type { CheckRow } from "./types";

export type Summary = {
  total: number;
  passed: number;
  failed: number;
  running: number;
  pending: number;
  totalMs: number;
  done: boolean;
};

export function summarize(rows: CheckRow[]): Summary {
  const count = (s: CheckRow["status"]) => rows.filter((r) => r.status === s).length;
  const passed = count("pass");
  const failed = count("fail");
  const running = count("running");
  return {
    total: rows.length,
    passed,
    failed,
    running,
    pending: rows.length - passed - failed - running,
    totalMs: rows.reduce((sum, r) => sum + (r.ms ?? 0), 0),
    done: rows.length > 0 && passed + failed === rows.length,
  };
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

/** One sentence for the card subtitle and the screen reader announcement. */
export function summaryText(s: Summary, everRun: boolean): string {
  if (!everRun) return "Not run yet. Runs against the live stack.";
  if (s.running > 0 || s.pending > 0) {
    return `Running. ${s.passed + s.failed} of ${s.total} done.`;
  }
  if (s.failed === 0) return `Done in ${formatMs(s.totalMs)}. All ${s.total} passed.`;
  return `Done in ${formatMs(s.totalMs)}. ${s.passed} passed, ${s.failed} failed.`;
}
