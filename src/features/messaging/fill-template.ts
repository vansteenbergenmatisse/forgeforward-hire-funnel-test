export const TEMPLATE_VARIABLES = ["first_name", "last_name", "project_name", "cal_link"] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

/** A {token}. Capitals match too, so {First_name} is caught as an unknown variable instead of going out as typed. */
export const TOKEN_RE = /\{([A-Za-z_]+)\}/g;

/** Every {token} in the text, in order, without duplicates. */
export function extractVariables(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(TOKEN_RE)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/**
 * A name as it may appear inside an outgoing message. Applicants type their own names, and the message goes out from the
 * company sender, so links, domain names, e-mail addresses and control characters are removed.
 */
export function cleanNameValue(raw: string): string {
  return raw
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, " ")
    .replace(/\b(?:[a-z][a-z0-9+.-]*:\/\/|www\.)\S*/gi, " ")
    .replace(/\S*@\S*/g, " ")
    .replace(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b\S*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  return body.replace(TOKEN_RE, (_m, name: string) => {
    const v = values[name];
    if (v === undefined || v === "") throw new MissingVariableError(name);
    return v;
  });
}
