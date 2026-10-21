import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { deleteObject, headObject, putObject, withPrefix } from "@/platform/r2";

export const dynamic = "force-dynamic";

export async function GET() {
  const failed: string[] = [];
  try {
    const key = `health-${crypto.randomUUID()}`;
    await db().insert(tables.idempotencyKeys).values({ key, route: "health", response: { ok: true } });
    const rows = await db().select().from(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.key, key));
    await db().delete(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.key, key));
    if (rows.length !== 1) failed.push("database");
  } catch {
    failed.push("database");
  }
  try {
    const key = withPrefix(`health/${crypto.randomUUID()}.txt`);
    await putObject(key, "ok", "text/plain");
    const head = await headObject(key);
    await deleteObject(key);
    if (!head) failed.push("r2");
  } catch {
    failed.push("r2");
  }
  return failed.length
    ? NextResponse.json({ ok: false, failed }, { status: 503 })
    : NextResponse.json({ ok: true });
}
