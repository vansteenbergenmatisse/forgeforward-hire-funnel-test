import { SLUG_MAX, validateSlug } from "@/features/projects";

export { SLUG_MAX, validateSlug };

/** Lowercase, hyphens, no accents. Used to suggest a slug from a role name. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}
