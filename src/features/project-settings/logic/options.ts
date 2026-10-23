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

/** Most choices one question can have. The server accepts the same number. */
export const OPTIONS_MAX = 30;
export const OPTION_MAX_LENGTH = 120;

/** Error for the choices editor, or null. Blank rows and repeated choices are errors, so what applicants see is exactly what was typed. */
export function validateOptions(type: string, options: readonly string[]): string | null {
  if (!typeNeedsOptions(type)) return null;
  if (options.length > OPTIONS_MAX) return `Use ${OPTIONS_MAX} choices or fewer.`;
  const filled = options.map((o) => o.trim().replace(/\s+/g, " ")).filter((o) => o !== "");
  if (filled.length < options.length) return "Fill in or remove the empty choice.";
  if (new Set(filled.map((o) => o.toLowerCase())).size < filled.length) return "Each choice must be different.";
  if (filled.length < 2) return "Add at least two different choices.";
  if (filled.some((o) => o.length > OPTION_MAX_LENGTH)) return `Keep each choice under ${OPTION_MAX_LENGTH} characters.`;
  return null;
}
