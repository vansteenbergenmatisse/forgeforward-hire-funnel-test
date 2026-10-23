import { and, eq, ne } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import { projectBySlug } from "./bundles";

/**
 * Deactivates ("closed") or reactivates ("open") a project. Idempotent: setting the status it already has changes nothing.
 * Only the status changes. Applicants, files and retention are untouched, and people mid-flow can still finish.
 * A project that is being deleted is not found, so it can never be reactivated.
 */
export async function setProjectStatus(slug: string, status: "open" | "closed"): Promise<{ slug: string; status: "open" | "closed"; changed: boolean; from: "open" | "closed" }> {
  const d = db();
  const cur = await projectBySlug(d, slug);
  const from = cur.status === "closed" ? "closed" : "open";
  if (from === status) return { slug, status, changed: false, from };
  await d.update(tables.projects).set({ status }).where(and(eq(tables.projects.id, cur.id), ne(tables.projects.status, "deleting")));
  return { slug, status, changed: true, from };
}
