import { MOCK_PROJECT, MOCK_QUESTIONS } from "@/features/projects";
import type { FunnelProject } from "../types";

/**
 * Loads a project for the public funnel. Mock data until the database is wired:
 * `appointment-setter` is open, `closed-demo` is closed, anything else is unknown.
 */
export async function getFunnelProject(slug: string): Promise<FunnelProject | null> {
  if (slug === MOCK_PROJECT.slug) return { ...MOCK_PROJECT, questions: MOCK_QUESTIONS };
  if (slug === "closed-demo") return { ...MOCK_PROJECT, slug, status: "closed", questions: MOCK_QUESTIONS };
  return null;
}
