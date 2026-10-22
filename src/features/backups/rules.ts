/** Backup and banner rules. Pure, so they are easy to test. */
export const BACKUP_PREFIX = "backups/";
export const BACKUP_KEEP_DAYS = 30;
export const BACKUP_MAX_AGE_HOURS = 26;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type SystemAlert = { id: string; title: string; detail: string; resolved: boolean };

/** backups/forge-hire-20261021T040000Z.sql.gz */
export function backupKey(now: Date): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return `${BACKUP_PREFIX}forge-hire-${stamp}.sql.gz`;
}

export type StoredBackup = { key: string; lastModified: Date };

/** Keys older than the keep window. Never returns the newest object, so pruning cannot empty the folder. */
export function selectBackupsToPrune(objects: StoredBackup[], now: Date, keepDays = BACKUP_KEEP_DAYS): string[] {
  const cutoff = now.getTime() - keepDays * DAY_MS;
  const sorted = [...objects].sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  return sorted
    .slice(1)
    .filter((o) => o.key.startsWith(BACKUP_PREFIX) && o.lastModified.getTime() < cutoff)
    .map((o) => o.key);
}

export type BackupRow = { ok: boolean; error: string | null; createdAt: Date };

export type BackupState =
  | { state: "ok"; hoursAgo: number }
  | { state: "stale"; hoursAgo: number | null }
  | { state: "failed"; error: string };

/** Newest row decides a failure. Otherwise the newest good backup must be under 26 hours old. */
export function backupState(rows: BackupRow[], now: Date): BackupState {
  const sorted = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const newest = sorted[0];
  if (newest && !newest.ok) return { state: "failed", error: newest.error ?? "The backup failed." };
  const lastGood = sorted.find((r) => r.ok);
  if (!lastGood) return { state: "stale", hoursAgo: null };
  const hoursAgo = (now.getTime() - lastGood.createdAt.getTime()) / HOUR_MS;
  return hoursAgo < BACKUP_MAX_AGE_HOURS ? { state: "ok", hoursAgo } : { state: "stale", hoursAgo };
}

export type ErrorRow = { source: string; message: string; createdAt: Date };

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

/** Browser-reported problems come from visitors, so only the newest few get their own alert. The rest are summed up. */
export const MAX_CLIENT_ALERTS = 3;

/** One alert per error source plus one for the backup. Resolved alerts are never returned. */
export function deriveAlerts(input: { errors: ErrorRow[]; backups: BackupRow[]; now: Date }): SystemAlert[] {
  const alerts: SystemAlert[] = [];

  const bySource = new Map<string, ErrorRow[]>();
  for (const e of input.errors) bySource.set(e.source, [...(bySource.get(e.source) ?? []), e]);
  const clientSources: { source: string; rows: ErrorRow[]; latestAt: number }[] = [];
  for (const [source, rows] of bySource) {
    const latest = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (source.startsWith("client:")) {
      clientSources.push({ source, rows, latestAt: latest.createdAt.getTime() });
      continue;
    }
    alerts.push({
      id: `errors:${source}`,
      title: `${rows.length} unresolved ${source} ${plural(rows.length, "error", "errors")}.`,
      detail: latest.message,
      resolved: false,
    });
  }

  clientSources.sort((a, b) => b.latestAt - a.latestAt);
  for (const { source, rows } of clientSources.slice(0, MAX_CLIENT_ALERTS)) {
    const latest = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    alerts.push({
      id: `errors:${source}`,
      title: `${rows.length} unresolved ${source} ${plural(rows.length, "error", "errors")}.`,
      detail: latest.message,
      resolved: false,
    });
  }
  const hidden = clientSources.slice(MAX_CLIENT_ALERTS);
  if (hidden.length > 0) {
    const n = hidden.reduce((sum, h) => sum + h.rows.length, 0);
    alerts.push({
      id: "errors:client:more",
      title: `${n} more unresolved browser ${plural(n, "error", "errors")}.`,
      detail: `${hidden.length} other browser event ${plural(hidden.length, "type", "types")}. Check the system errors list.`,
      resolved: false,
    });
  }

  const b = backupState(input.backups, input.now);
  if (b.state === "failed") {
    alerts.push({ id: "backup", title: "The last backup failed.", detail: b.error, resolved: false });
  } else if (b.state === "stale") {
    alerts.push({
      id: "backup",
      title: "No backup in the last 26 hours.",
      detail: "The 04:00 UTC backup did not run. Open the test console to check it.",
      resolved: false,
    });
  }
  return alerts;
}

/** Text for test console check 12. */
export function backupCheckText(state: BackupState): { ok: boolean; text: string } {
  if (state.state === "ok") return { ok: true, text: `Last backup ${Math.max(1, Math.round(state.hoursAgo))} hours ago` };
  if (state.state === "failed") return { ok: false, text: `The last backup failed: ${state.error}` };
  if (state.hoursAgo === null) return { ok: false, text: "No backup yet. It must be under 26 hours old." };
  return { ok: false, text: `Last backup ${Math.round(state.hoursAgo)} hours ago. It must be under 26 hours.` };
}
