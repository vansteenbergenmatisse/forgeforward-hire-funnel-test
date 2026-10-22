import { request, type APIRequestContext } from "@playwright/test";
import { BASE_URL, secret } from "./env";

export type TestCounts = { rows: number; files: number };

/** An API client that is signed in with the admin password, the same way the login page does it. */
export async function adminApi(): Promise<APIRequestContext> {
  const api = await request.newContext({ baseURL: BASE_URL });
  const res = await api.post("/adminMatt/login/submit", { data: { password: secret("ADMIN_PASSWORD") }, headers: { origin: BASE_URL } });
  if (!res.ok()) {
    await api.dispose();
    throw new Error(`Admin password login failed with HTTP ${res.status()}`);
  }
  return api;
}

export async function testCounts(api: APIRequestContext): Promise<TestCounts> {
  const res = await api.get("/api/admin/test/data");
  if (!res.ok()) throw new Error(`GET /api/admin/test/data returned ${res.status()}`);
  return (await res.json()) as TestCounts;
}

/** Deletes every is_test applicant with its R2 files, then returns what is left. */
export async function deleteTestData(api: APIRequestContext): Promise<TestCounts> {
  const res = await api.delete("/api/admin/test/data", { timeout: 120_000 });
  if (!res.ok()) throw new Error(`DELETE /api/admin/test/data returned ${res.status()}`);
  return (await res.json()) as TestCounts;
}
