import { CHECKS } from "./checks";
import type { CheckDef, CheckRow, TestRunner } from "./types";

type Options = {
  checks?: CheckDef[];
  signal?: AbortSignal;
  /** Called with a fresh copy of the rows after every change. */
  onUpdate: (rows: CheckRow[]) => void;
};

/** Runs the checks one after the other. A failed check does not stop the run. Returns the final rows. */
export async function runSequence(runner: TestRunner, { checks = CHECKS, signal, onUpdate }: Options): Promise<CheckRow[]> {
  const rows: CheckRow[] = checks.map((c) => ({ id: c.id, label: c.label, status: "idle" }));
  const emit = () => onUpdate(rows.map((r) => ({ ...r })));
  emit();
  for (let i = 0; i < rows.length; i++) {
    if (signal?.aborted) break;
    rows[i] = { ...rows[i], status: "running" };
    emit();
    try {
      const res = await runner.runCheck(rows[i].id);
      if (signal?.aborted) break;
      rows[i] = res.ok
        ? { ...rows[i], status: "pass", ms: res.ms, detail: res.detail }
        : { ...rows[i], status: "fail", ms: res.ms, error: res.error ?? "Check failed.", detail: undefined };
    } catch (e) {
      rows[i] = { ...rows[i], status: "fail", ms: 0, error: e instanceof Error ? e.message : "Check threw an error." };
    }
    emit();
  }
  return rows;
}
