import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, db, tables } from "@/platform/db";
import { deleteObject, headObject, putObject, signedPutUrl, withPrefix } from "@/platform/r2";

const haveDb = Boolean(process.env.TEST_DATABASE_URL);
const haveR2 = Boolean(process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID);

if (haveDb) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.R2_KEY_PREFIX ||= "test/";
process.env.ADMIN_KEY ||= "t".repeat(48);

afterAll(closeDb);

describe.skipIf(!haveDb)("database", () => {
  it("writes and reads a row", async () => {
    const key = `it-${crypto.randomUUID()}`;
    await db().insert(tables.idempotencyKeys).values({ key, route: "test", response: { a: 1 } });
    const rows = await db().select().from(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.key, key));
    expect(rows).toHaveLength(1);
    await db().delete(tables.idempotencyKeys).where(eq(tables.idempotencyKeys.key, key));
  });
});

describe.skipIf(!haveR2)("r2", () => {
  it("puts, heads and deletes an object under the test prefix", async () => {
    const key = withPrefix(`it/${crypto.randomUUID()}.txt`);
    expect(key.startsWith("test/")).toBe(true);
    await putObject(key, "hello", "text/plain");
    expect((await headObject(key))?.bytes).toBe(5);
    await deleteObject(key);
    expect(await headObject(key)).toBeNull();
  });
  it("makes a signed PUT url", async () => {
    expect(await signedPutUrl(withPrefix("it/x.webm"), "video/webm")).toContain("X-Amz-Signature");
  });
});
