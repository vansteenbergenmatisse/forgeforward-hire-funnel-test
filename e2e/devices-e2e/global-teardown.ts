import { adminApi, deleteTestData, testCounts } from "./admin";

/**
 * Runs after every run, also a failed one. Removes all is_test data and proves nothing is left.
 * R2 listings can lag a moment behind a delete, so a leftover is retried a few times before it counts as a failure.
 */
export default async function globalTeardown() {
  const api = await adminApi();
  try {
    let check = { rows: -1, files: -1 };
    for (let attempt = 1; attempt <= 5; attempt++) {
      await deleteTestData(api);
      if (attempt > 1) await new Promise((r) => setTimeout(r, 3000));
      check = await testCounts(api);
      if (check.rows === 0 && check.files === 0) break;
    }
    console.log(`[devices-e2e] cleanup: ${check.rows} rows and ${check.files} files left`);
    if (check.rows !== 0 || check.files !== 0) throw new Error(`Test data left behind: ${check.rows} rows, ${check.files} files`);
  } finally {
    await api.dispose();
  }
}
