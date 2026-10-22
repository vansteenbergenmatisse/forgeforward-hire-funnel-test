import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { deleteObject, headObject, putObject, withPrefix } from "@/platform/r2";
import { rejectUnlessCron } from "@/platform/cron/auth";

export const dynamic = "force-dynamic";

/** Public: one cheap read. With the cron bearer secret it also writes and reads back a row and an R2 object. */
export async function GET(req: Request) {
  const deep = rejectUnlessCron(req) === null;
  const failed: string[] = [];
  try {
    if (!deep) {
      await db().execute(sql`select 1`);
    } else {
      const key = `health-${crypto.randomUUID()}`;
      await db().insert(tables.idempotencyKeys).values({ key, route: "health", response: { ok: true } });
      const rows = await db().select().from(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.key, key));
      await db().delete(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.key, key));
      if (rows.length !== 1) failed.push("database");
    }
  } catch {
    failed.push("database");
  }
  if (deep) {
    try {
      const key = withPrefix(`health/${crypto.randomUUID()}.txt`);
      await putObject(key, "ok", "text/plain");
      const head = await headObject(key);
      await deleteObject(key);
      if (!head) failed.push("r2");
    } catch {
      failed.push("r2");
    }
  }
  // The public answer never says which dependency failed.
  if (failed.length === 0) return NextResponse.json({ ok: true });
  return NextResponse.json(deep ? { ok: false, failed } : { ok: false }, { status: 503 });
}
