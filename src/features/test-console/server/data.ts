import { eq, like } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { deleteObject, listObjects } from "@/platform/r2";
import { deleteApplicant, r2KeysOf } from "@/features/applicants/server";
import type { TestDataCounts } from "../types";

const STRAY_PREFIX = "test/";

async function strayKeys(): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await listObjects(STRAY_PREFIX, { token });
    keys.push(...page.objects.map((o) => o.key));
    token = page.next;
  } while (token);
  return keys;
}

async function testApplicants() {
  return db().select().from(tables.applicants).where(eq(tables.applicants.isTest, true));
}

/** Test applicants plus the files they own and anything under the test/ prefix. */
export async function countTestData(): Promise<TestDataCounts> {
  const rows = await testApplicants();
  const keys = new Set([...rows.flatMap((r) => r2KeysOf(r)), ...(await strayKeys())]);
  return { rows: rows.length, files: keys.size };
}

/** Removes every is_test applicant (rows, events, messages, R2 files) and stray test/ objects. Returns what is left. */
export async function deleteTestData(): Promise<TestDataCounts> {
  for (const row of await testApplicants()) await deleteApplicant(row.id);
  for (const key of await strayKeys()) await deleteObject(key);
  // Leftovers of the console's own webhook and idempotency rows.
  await db().delete(tables.processedWebhooks).where(like(tables.processedWebhooks.externalId, "%console-test-%"));
  await db().delete(tables.idempotencyKeys).where(like(tables.idempotencyKeys.key, "console-%"));
  return countTestData();
}

