/** j***@example.com */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

/** +31 6 ****** 78: keeps the country code and the last two digits. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length < 6) return "***";
  const head = digits.slice(0, 3);
  const tail = digits.slice(-2);
  return `${head} ${"*".repeat(Math.max(3, digits.length - 5))} ${tail}`;
}
