import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export type ParsedPhone = { e164: string; country: string | null };

/** Returns null when the number is not valid for the given default country. */
export function parsePhone(input: string, defaultCountry?: string): ParsedPhone | null {
  const parsed = parsePhoneNumberFromString(input.trim(), defaultCountry as CountryCode | undefined);
  if (!parsed || !parsed.isValid()) return null;
  return { e164: parsed.number, country: parsed.country ?? null };
}
