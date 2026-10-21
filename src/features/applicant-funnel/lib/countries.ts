import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

export type CountryOption = { code: CountryCode; name: string; dial: string };

export function listCountries(locale = "en"): CountryOption[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    names = null;
  }
  return getCountries()
    .map((code) => ({ code, name: names?.of(code) ?? code, dial: `+${getCountryCallingCode(code)}` }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Country from a BCP47 locale such as en-US. Falls back to US. */
export function countryFromLocale(locale: string | undefined): CountryCode {
  const region = locale?.split("-").find((p) => /^[A-Za-z]{2}$/.test(p) && p.length === 2 && p === p.toUpperCase());
  const match = region && getCountries().includes(region as CountryCode) ? (region as CountryCode) : null;
  return match ?? "US";
}
