import { and, desc, eq, isNull } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { backupCheckText, backupState, deriveAlerts, type SystemAlert } from "./rules";

async function loadInputs() {
  const [errors, backups] = await Promise.all([
    db()
      .select({ source: tables.systemErrors.source, message: tables.systemErrors.message, createdAt: tables.systemErrors.createdAt })
      .from(tables.systemErrors)
      .where(isNull(tables.systemErrors.resolvedAt)),
    db()
      .select({ ok: tables.backups.ok, error: tables.backups.error, createdAt: tables.backups.createdAt })
      .from(tables.backups)
      .orderBy(desc(tables.backups.createdAt))
      .limit(20),
  ]);
  return { errors, backups };
}

/** Data for the red banners on the Projects home. */
export async function getSystemAlerts(now = new Date()): Promise<SystemAlert[]> {
  return deriveAlerts({ ...(await loadInputs()), now });
}

/** Marks every unresolved error of a source as resolved. The backup alert clears itself when a good backup lands. */
export async function resolveAlert(alertId: string): Promise<boolean> {
  if (!alertId.startsWith("errors:")) return false;
  const source = alertId.slice("errors:".length);
  await db()
    .update(tables.systemErrors)
    .set({ resolvedAt: new Date() })
    .where(and(eq(tables.systemErrors.source, source), isNull(tables.systemErrors.resolvedAt)));
  return true;
}

/** Test console check 12. */
export async function checkLastBackup(now = new Date()) {
  const { backups } = await loadInputs();
  return backupCheckText(backupState(backups, now));
}
