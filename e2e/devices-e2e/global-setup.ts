import { adminApi, testCounts } from "./admin";
import { BASE_URL } from "./env";

/** Fails fast on a wrong password or a wrong ADMIN_KEY-less target, and reports what test data already exists. */
export default async function globalSetup() {
  const api = await adminApi();
  try {
    const before = await testCounts(api);
    console.log(`[devices-e2e] target ${BASE_URL}; test data before the run: ${before.rows} rows, ${before.files} files`);
  } finally {
    await api.dispose();
  }
}
