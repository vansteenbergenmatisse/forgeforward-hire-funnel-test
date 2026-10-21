import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __sql?: postgres.Sql; __db?: Db };

export function db(): Db {
  if (!globalForDb.__db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.__sql = postgres(url, { max: 10, prepare: false });
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
