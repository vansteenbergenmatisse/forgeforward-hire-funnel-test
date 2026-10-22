type Vars = { firstName: string; replyDays: number };

/** Replaces {first_name} and {reply_days}. Unknown placeholders are left as they are. */
export function fillThankYou(template: string, vars: Vars): string {
  // Replacer functions keep "$&" and "$'" in a name from being read as patterns.
  const name = vars.firstName.trim();
  return template.replaceAll("{first_name}", () => name).replaceAll("{reply_days}", () => String(vars.replyDays));
}

/**
 * Splits the template at its first sentence, then fills each part, so a name with a full stop in it cannot move the split.
 * The heading loses a trailing full stop or comma. No lookbehind: older iOS Safari cannot parse it.
 */
export function splitThankYou(template: string, vars: Vars): { heading: string; body: string } {
  const trimmed = template.trim();
  const m = trimmed.match(/^(.+?[.!?])(\s+|$)([\s\S]*)$/);
  const first = m ? m[1] : trimmed;
  const rest = m ? m[3] : "";
  return { heading: fillThankYou(first, vars).replace(/[.,]$/, ""), body: fillThankYou(rest, vars).trim() };
}
