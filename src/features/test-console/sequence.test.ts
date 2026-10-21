import { describe, expect, it } from "vitest";
import { runSequence } from "./sequence";
import type { CheckRow, TestRunner } from "./types";

const runnerFrom = (fn: TestRunner["runCheck"]): TestRunner => ({ runCheck: fn });

describe("runSequence", () => {
  it("runs checks in order, one at a time", async () => {
    const order: string[] = [];
    let active = 0;
    let maxActive = 0;
    const rows = await runSequence(
      runnerFrom(async (id) => {
        active++;
        maxActive = Math.max(maxActive, active);
        order.push(id);
        await Promise.resolve();
        active--;
        return { ok: true, ms: 5 };
      }),
      { onUpdate: () => {} },
    );
    expect(order[0]).toBe("db");
    expect(order[12]).toBe("integrity");
    expect(order).toHaveLength(13);
    expect(maxActive).toBe(1);
    expect(rows.every((r) => r.status === "pass")).toBe(true);
  });

  it("keeps going after a failure and keeps the error text", async () => {
    const rows = await runSequence(
      runnerFrom(async (id) => (id === "backup" ? { ok: false, ms: 38, error: "Last backup 31 hours ago" } : { ok: true, ms: 1 })),
      { onUpdate: () => {} },
    );
    const failed = rows.filter((r) => r.status === "fail");
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ id: "backup", error: "Last backup 31 hours ago", ms: 38 });
    expect(rows.at(-1)?.status).toBe("pass");
  });

  it("turns a thrown error into a failed row", async () => {
    const rows = await runSequence(
      runnerFrom(async (id) => {
        if (id === "r2") throw new Error("boom");
        return { ok: true, ms: 1 };
      }),
      { onUpdate: () => {} },
    );
    expect(rows[1]).toMatchObject({ status: "fail", error: "boom" });
  });

  it("shows running before the result and stops when aborted", async () => {
    const ctrl = new AbortController();
    const seen: CheckRow[][] = [];
    const rows = await runSequence(
      runnerFrom(async (id) => {
        if (id === "r2") ctrl.abort();
        return { ok: true, ms: 1 };
      }),
      { signal: ctrl.signal, onUpdate: (r) => seen.push(r) },
    );
    expect(seen.some((r) => r[0].status === "running")).toBe(true);
    expect(rows[0].status).toBe("pass");
    expect(rows[2].status).toBe("idle");
  });
});
