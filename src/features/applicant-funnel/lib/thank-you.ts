/** Replaces {first_name} and {reply_days}. Unknown placeholders are left as they are. */
export function fillThankYou(template: string, vars: { firstName: string; replyDays: number }): string {
  return template
    .replaceAll("{first_name}", vars.firstName.trim())
    .replaceAll("{reply_days}", String(vars.replyDays));
}
