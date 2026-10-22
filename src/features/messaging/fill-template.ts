export const TEMPLATE_VARIABLES = ["first_name", "last_name", "project_name", "cal_link"] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

/** Every {token} in the text, in order, without duplicates. */
export function extractVariables(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\{([a-z_]+)\}/g)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/** Tokens in the text that are not a known template variable. They would block every send. */
export function unknownVariables(text: string): string[] {
  const known: readonly string[] = TEMPLATE_VARIABLES;
  return extractVariables(text).filter((v) => !known.includes(v));
}

export class MissingVariableError extends Error {
  constructor(public readonly variable: string) {
    super(`Missing value for {${variable}}`);
    this.name = "MissingVariableError";
  }
}

/** Replaces {name} tokens. A missing or empty value throws and names the variable. */
export function fillTemplate(body: string, values: Record<string, string | undefined>): string {
  return body.replace(/\{([a-z_]+)\}/g, (_m, name: string) => {
    const v = values[name];
    if (v === undefined || v === "") throw new MissingVariableError(name);
    return v;
  });
}
