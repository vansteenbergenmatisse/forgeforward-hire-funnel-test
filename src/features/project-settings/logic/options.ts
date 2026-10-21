/** Trims, drops blanks and removes case-insensitive duplicates, keeping the first spelling. */
export function normalizeOptions(options: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of options) {
    const v = raw.trim().replace(/\s+/g, " ");
    const key = v.toLowerCase();
    if (v === "" || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export function typeNeedsOptions(type: string): boolean {
  return type === "single_choice" || type === "multi_choice";
}

/** Error for the choices editor, or null. */
export function validateOptions(type: string, options: readonly string[]): string | null {
  if (!typeNeedsOptions(type)) return null;
  const n = normalizeOptions(options).length;
  if (n < 2) return "Add at least two different choices.";
  return null;
}
