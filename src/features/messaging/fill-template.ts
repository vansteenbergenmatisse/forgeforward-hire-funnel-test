export const TEMPLATE_VARIABLES = ["first_name", "last_name", "project_name", "cal_link"] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

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
