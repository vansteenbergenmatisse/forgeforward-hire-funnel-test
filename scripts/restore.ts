import { config } from "dotenv";
import postgres from "postgres";
import { BACKUP_PREFIX } from "@/features/backups";
import { getObjectBytes, listObjects, withPrefix } from "@/platform/r2";
import { restoreGzipped, sameDatabase, withDatabase } from "./lib/pg-tools";

config({ path: [".env.local", ".env.development.local", ".env"], quiet: true });
process.env.DATABASE_URL ||= process.env.DATABASE_URL_UNPOOLED;
process.env.ADMIN_KEY ||= "restore-script-does-not-use-this-key-000000";

/*
 * Usage
 *   tsx scripts/restore.ts --prove
 *       Restores the newest backup into a throwaway database on the TEST_DATABASE_URL server,
 *       compares row counts with DATABASE_URL_UNPOOLED, then drops the throwaway database.
 *   tsx scripts/restore.ts --target <postgres url> [--key backups/forge-hire-....sql.gz]
 *       Restores into an EMPTY database. Refuses the live database and any database that has tables.
 */

const COUNT_SCHEMAS = ["public", "drizzle"];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function newestBackupKey(): Promise<string> {
  const all = [];
  let token: string | undefined;
  do {
    const page = await listObjects(withPrefix(BACKUP_PREFIX), { token });
    all.push(...page.objects);
    token = page.next;
  } while (token);
  const newest = all.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())[0];
  if (!newest) throw new Error("No backups found in R2.");
  return newest.key;
}

export async function rowCounts(url: string): Promise<Record<string, number>> {
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const tables = await sql<{ schemaname: string; tablename: string }[]>`
      select schemaname, tablename from pg_tables where schemaname = any(${COUNT_SCHEMAS}) order by 1, 2`;
    const out: Record<string, number> = {};
    for (const t of tables) {
      const [row] = await sql.unsafe(`select count(*)::int as n from "${t.schemaname}"."${t.tablename}"`);
      out[`${t.schemaname}.${t.tablename}`] = row.n as number;
    }
    return out;
  } finally {
    await sql.end();
  }
}

async function isEmpty(url: string) {
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const [r] = await sql`select count(*)::int as n from pg_tables where schemaname = any(${COUNT_SCHEMAS})`;
    return r.n === 0;
  } finally {
    await sql.end();
  }
}

async function restoreInto(target: string, key: string) {
  const live = [process.env.DATABASE_URL_UNPOOLED, process.env.DATABASE_URL].filter(Boolean) as string[];
  if (live.some((l) => sameDatabase(l, target))) throw new Error("Refusing to restore into the live database.");
  if (!(await isEmpty(target))) throw new Error("The target database is not empty. Use an empty database.");
  const bytes = await getObjectBytes(key);
  await restoreGzipped(target, Buffer.from(bytes));
}

async function prove() {
  const source = process.env.DATABASE_URL_UNPOOLED;
  const testServer = process.env.TEST_DATABASE_URL;
  if (!source) throw new Error("DATABASE_URL_UNPOOLED is not set.");
  if (!testServer) throw new Error("TEST_DATABASE_URL is not set.");
  const key = arg("key") ?? (await newestBackupKey());
  const name = `restore_check_${Date.now().toString(36)}`;
  const admin = postgres(testServer, { max: 1, prepare: false });
  let created = false;
  try {
    await admin.unsafe(`create database ${name}`);
    created = true;
    const target = withDatabase(testServer, name);
    await restoreInto(target, key);
    const [expected, actual] = [await rowCounts(source), await rowCounts(target)];
    const names = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
    let mismatches = 0;
    for (const n of names) {
      const same = expected[n] === actual[n];
      if (!same) mismatches += 1;
      console.log(`${same ? "ok  " : "DIFF"} ${n}: source ${expected[n] ?? "missing"}, restored ${actual[n] ?? "missing"}`);
    }
    if (mismatches) throw new Error(`${mismatches} tables differ.`);
    console.log(`Restore proven from ${key} into ${name}: ${names.length} tables match.`);
  } finally {
    if (created) await admin.unsafe(`drop database if exists ${name} with (force)`);
    await admin.end();
    if (created) console.log(`Dropped throwaway database ${name}.`);
  }
}

async function main() {
  if (process.argv.includes("--prove")) return prove();
  const target = arg("target");
  if (!target) throw new Error("Pass --prove or --target <postgres url>.");
  const key = arg("key") ?? (await newestBackupKey());
  await restoreInto(target, key);
  console.log(`Restored ${key}.`);
}

main().catch((err) => {
  console.error("Restore failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
