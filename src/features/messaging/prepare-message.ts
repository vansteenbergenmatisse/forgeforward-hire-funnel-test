import { fillTemplate, MissingVariableError } from "./fill-template";

export type PrepareResult =
  | { ok: true; body: string; subject: string; used: string[] }
  | { ok: false; variable: string; message: string };

/** Fills a template. A missing variable blocks the send and is named. */
export function prepareMessage(
  template: { body: string; subject?: string },
  values: Record<string, string | undefined>,
): PrepareResult {
  try {
    const body = fillTemplate(template.body, values);
    const subject = template.subject ? fillTemplate(template.subject, values) : "";
    const used = Array.from(new Set(Array.from((template.body + (template.subject ?? "")).matchAll(/\{([a-z_]+)\}/g), (m) => m[1])));
    return { ok: true, body, subject, used };
  } catch (e) {
    if (e instanceof MissingVariableError) return { ok: false, variable: e.variable, message: `Missing value for {${e.variable}}. Fill it in before sending.` };
    throw e;
  }
}

/** Validation for an edited preview: nothing blank and no unfilled {token} left. */
export function validateOutgoing(body: string): string | null {
  if (!body.trim()) return "The message is empty.";
  const left = body.match(/\{([a-z_]+)\}/);
  return left ? `Replace {${left[1]}} before sending.` : null;
}
