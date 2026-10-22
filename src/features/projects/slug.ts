export const SLUG_MAX = 60;

/** Slugs that would collide with app routes. */
export const RESERVED_SLUGS = ["admin", "api", "apply", "test", "new", "settings"] as const;

/** Returns an error message, or null when the slug is fine. `taken` lists slugs used by other projects. */
export function validateSlug(slug: string, taken: readonly string[] = []): string | null {
  if (slug.trim() === "") return "Add a link slug. It is the end of the applicant link.";
  if (slug.length > SLUG_MAX) return `Use ${SLUG_MAX} characters or fewer.`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "Use lowercase letters, numbers and single hyphens, like appointment-setter.";
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) return `"${slug}" is reserved. Pick another slug.`;
  if (taken.includes(slug)) return "Another project already uses this slug. Pick another one.";
  return null;
}

/** Slug suggestion from a role name. Falls back to "project". */
export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX - 4)
    .replace(/-+$/g, "");
  return s || "project";
}

/** "sales-rep" taken -> "sales-rep-2", then "-3"... Reserved slugs count as taken. */
export function uniqueSlug(name: string, taken: string[]): string {
  const all = [...taken, ...RESERVED_SLUGS];
  const base = slugify(name);
  if (!all.includes(base)) return base;
  let n = 2;
  while (all.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
