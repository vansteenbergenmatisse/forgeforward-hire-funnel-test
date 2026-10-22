import { config } from "dotenv";
import { backupKey, selectBackupsToPrune, BACKUP_PREFIX } from "@/features/backups";
import { closeDb, db, tables } from "@/platform/db";
import { deleteObject, headObject, listObjects, putObject, withPrefix } from "@/platform/r2";
import { dumpGzipped, looksComplete } from "./lib/pg-tools";

// .env.local (vercel env pull) wins over .env. CI passes real env vars instead.
config({ path: [".env.local", ".env.development.local", ".env"], quiet: true });

// The database client reads DATABASE_URL. R2 settings come from r2Env(), which needs no admin key.
process.env.DATABASE_URL ||= process.env.DATABASE_URL_UNPOOLED;

async function record(row: { r2Key: string; bytes: number; ok: boolean; error?: string }) {
  try {
    await db().insert(tables.backups).values({ ...row, error: row.error ?? null });
  } catch (err) {
    console.error("Could not write the backups row:", err instanceof Error ? err.message : err);
  }
}

async function prune(now: Date) {
  const stored = [];
  let token: string | undefined;
  do {
    const page = await listObjects(withPrefix(BACKUP_PREFIX), { token });
    stored.push(...page.objects);
    token = page.next;
  } while (token);
  const old = selectBackupsToPrune(
    stored.map((o) => ({ key: o.key.slice(withPrefix("").length), lastModified: o.lastModified })),
    now,
  );
  for (const key of old) await deleteObject(withPrefix(key));
  return old.length;
}

async function main() {
  const source = process.env.DATABASE_URL_UNPOOLED;
  if (!source) throw new Error("DATABASE_URL_UNPOOLED is not set. pg_dump needs the direct (unpooled) connection string.");
  const now = new Date();
  const key = withPrefix(backupKey(now));
  try {
    const gz = await dumpGzipped(source);
    if (!looksComplete(gz)) throw new Error("The dump is cut short (no completion marker).");
    await putObject(key, gz, "application/gzip");
    const head = await headObject(key);
    if (!head || head.bytes !== gz.length) throw new Error("Upload check failed: stored size does not match.");
    await record({ r2Key: key, bytes: gz.length, ok: true });
    const pruned = await prune(now);
    console.log(`Backup ok: ${key} (${gz.length} bytes). Pruned ${pruned} old backups.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backup failed";
    await record({ r2Key: key, bytes: 0, ok: false, error: message.slice(0, 500) });
    throw err;
  }
}

main()
  .catch((err) => {
    console.error("Backup failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closeDb);

