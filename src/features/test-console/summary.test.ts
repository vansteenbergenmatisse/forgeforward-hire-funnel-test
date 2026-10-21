import { describe, expect, it } from "vitest";
import { idleRows } from "./checks";
import { formatMs, summarize, summaryText } from "./summary";

describe("summarize", () => {
  it("counts an idle table", () => {
    const s = summarize(idleRows());
    expect(s).toMatchObject({ total: 13, passed: 0, failed: 0, pending: 13, done: false });
  });

  it("is done when every row passed or failed", () => {
    const rows = idleRows().map((r, i) => ({ ...r, status: i === 11 ? ("fail" as const) : ("pass" as const), ms: 10 }));
    const s = summarize(rows);
    expect(s).toMatchObject({ passed: 12, failed: 1, done: true, totalMs: 130 });
  });

  it("is not done while a row runs", () => {
    const rows = idleRows();
    rows[0] = { ...rows[0], status: "running" };
    expect(summarize(rows)).toMatchObject({ running: 1, pending: 12, done: false });
  });
});

describe("formatMs", () => {
  it("switches to seconds from 1000", () => {
    expect(formatMs(42)).toBe("42 ms");
    expect(formatMs(1400)).toBe("1.4 s");
  });
});

describe("summaryText", () => {
  it("reports failures", () => {
    const rows = idleRows().map((r, i) => ({ ...r, status: i === 3 ? ("fail" as const) : ("pass" as const), ms: 100 }));
    expect(summaryText(summarize(rows), true)).toBe("Done in 1.3 s. 12 passed, 1 failed.");
  });
  it("reports a clean run", () => {
    const rows = idleRows().map((r) => ({ ...r, status: "pass" as const, ms: 100 }));
    expect(summaryText(summarize(rows), true)).toBe("Done in 1.3 s. All 13 passed.");
  });
});
