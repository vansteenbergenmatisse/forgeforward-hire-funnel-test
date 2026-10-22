import { describe, expect, it } from "vitest";
import { backupCheckText, backupKey, backupState, deriveAlerts, selectBackupsToPrune } from "./rules";

const now = new Date("2026-10-21T10:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
const daysAgo = (d: number) => hoursAgo(d * 24);

describe("backupKey", () => {
  it("is sortable and under backups/", () => {
    expect(backupKey(new Date("2026-10-21T04:00:07.123Z"))).toBe("backups/forge-hire-20261021T040007Z.sql.gz");
  });
});

describe("selectBackupsToPrune", () => {
  const obj = (name: string, age: number) => ({ key: `backups/${name}.sql.gz`, lastModified: daysAgo(age) });
  it("prunes only backups older than 30 days", () => {
    const keys = selectBackupsToPrune([obj("a", 1), obj("b", 29), obj("c", 31), obj("d", 60)], now);
    expect(keys).toEqual(["backups/c.sql.gz", "backups/d.sql.gz"]);
  });
  it("never deletes the newest backup, even when everything is old", () => {
    expect(selectBackupsToPrune([obj("a", 40), obj("b", 50)], now)).toEqual(["backups/b.sql.gz"]);
  });
  it("ignores keys outside backups/", () => {
    expect(selectBackupsToPrune([obj("a", 1), { key: "videos/x", lastModified: daysAgo(90) }], now)).toEqual([]);
  });
  it("handles an empty list", () => {
    expect(selectBackupsToPrune([], now)).toEqual([]);
  });
});

describe("backupState", () => {
  it("is ok under 26 hours", () => {
    expect(backupState([{ ok: true, error: null, createdAt: hoursAgo(25) }], now).state).toBe("ok");
  });
  it("is stale at 26 hours or more", () => {
    expect(backupState([{ ok: true, error: null, createdAt: hoursAgo(26) }], now).state).toBe("stale");
  });
  it("is stale when there is no backup at all", () => {
    expect(backupState([], now)).toEqual({ state: "stale", hoursAgo: null });
  });
  it("is failed when the newest row failed, even if an older one was good", () => {
    const s = backupState(
      [
        { ok: true, error: null, createdAt: hoursAgo(30) },
        { ok: false, error: "pg_dump exited 1", createdAt: hoursAgo(2) },
      ],
      now,
    );
    expect(s).toEqual({ state: "failed", error: "pg_dump exited 1" });
  });
  it("recovers after a good backup follows a failed one", () => {
    const s = backupState(
      [
        { ok: false, error: "x", createdAt: hoursAgo(10) },
        { ok: true, error: null, createdAt: hoursAgo(1) },
      ],
      now,
    );
    expect(s.state).toBe("ok");
  });
});

describe("deriveAlerts", () => {
  const good = [{ ok: true, error: null, createdAt: hoursAgo(3) }];
  it("returns nothing when all is well", () => {
    expect(deriveAlerts({ errors: [], backups: good, now })).toEqual([]);
  });
  it("shows only the newest browser event types and sums up the rest", () => {
    const errors = Array.from({ length: 6 }, (_, i) => ({ source: `client:t${i}`, message: "m", createdAt: hoursAgo(i + 1) }));
    const alerts = deriveAlerts({ errors, backups: good, now });
    expect(alerts.map((a) => a.id)).toEqual(["errors:client:t0", "errors:client:t1", "errors:client:t2", "errors:client:more"]);
    expect(alerts[3].title).toBe("3 more unresolved browser errors.");
  });
  it("groups unresolved errors by source with the latest message", () => {
    const alerts = deriveAlerts({
      errors: [
        { source: "retention", message: "old", createdAt: hoursAgo(5) },
        { source: "retention", message: "new", createdAt: hoursAgo(1) },
        { source: "integrity", message: "file missing", createdAt: hoursAgo(2) },
      ],
      backups: good,
      now,
    });
    expect(alerts.map((a) => a.id)).toEqual(["errors:retention", "errors:integrity"]);
    expect(alerts[0]).toMatchObject({ title: "2 unresolved retention errors.", detail: "new", resolved: false });
    expect(alerts[1].title).toBe("1 unresolved integrity error.");
  });
  it("adds a backup alert when stale or failed", () => {
    expect(deriveAlerts({ errors: [], backups: [], now })[0]).toMatchObject({ id: "backup", title: "No backup in the last 26 hours." });
    const failed = deriveAlerts({ errors: [], backups: [{ ok: false, error: "R2 down", createdAt: hoursAgo(1) }], now });
    expect(failed[0]).toMatchObject({ id: "backup", title: "The last backup failed.", detail: "R2 down" });
  });
});

describe("backupCheckText", () => {
  it("passes with the age", () => {
    expect(backupCheckText({ state: "ok", hoursAgo: 3.2 })).toEqual({ ok: true, text: "Last backup 3 hours ago" });
  });
  it("fails with a reason", () => {
    expect(backupCheckText({ state: "stale", hoursAgo: 31 })).toEqual({ ok: false, text: "Last backup 31 hours ago. It must be under 26 hours." });
    expect(backupCheckText({ state: "stale", hoursAgo: null }).ok).toBe(false);
    expect(backupCheckText({ state: "failed", error: "boom" }).text).toContain("boom");
  });
});
