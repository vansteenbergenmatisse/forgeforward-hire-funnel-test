import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { chooseDatabaseUrl, hostOf, needsTls } from "./url";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __sql?: postgres.Sql; __db?: Db };

export function db(): Db {
  if (!globalForDb.__db) {
    const choice = chooseDatabaseUrl(process.env);
    if (!choice) throw new Error("DATABASE_URL is not set");
    // Say which variable and host won, so a wrong database is easy to spot. No credentials are logged.
    console.info(`[db] using ${choice.source} (host ${hostOf(choice.url)})`);
    globalForDb.__sql = postgres(choice.url, {
      max: 10,
      prepare: false,
      ...(needsTls(choice.url) ? { ssl: "require" as const } : {}),
    });
    globalForDb.__db = drizzle(globalForDb.__sql, { schema });
  }
  return globalForDb.__db;
}

export async function closeDb() {
  await globalForDb.__sql?.end();
  globalForDb.__sql = undefined;
  globalForDb.__db = undefined;
}

export * as tables from "./schema";
export { tryRecordRateLimitHit } from "./rate-limit";
export { pruneOperationalTables } from "./prune";
