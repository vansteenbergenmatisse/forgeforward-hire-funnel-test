export const SLUG_MAX = 60;

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

const RESERVED = new Set(["admin", "api", "apply", "test", "new", "settings"]);

/** Returns an error message, or null when the slug is fine. `taken` lists slugs used by other projects. */
export function validateSlug(slug: string, taken: readonly string[] = []): string | null {
  if (slug.trim() === "") return "Add a link slug. It is the end of the applicant link.";
  if (slug.length > SLUG_MAX) return `Use ${SLUG_MAX} characters or fewer.`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "Use lowercase letters, numbers and single hyphens, like appointment-setter.";
  if (RESERVED.has(slug)) return `"${slug}" is reserved. Pick another slug.`;
  if (taken.includes(slug)) return "Another project already uses this slug. Pick another one.";
  return null;
}
