import { countryFromLocale } from "../lib/countries";
import type { FormValues } from "../lib/form-validation";
import { browserTimeZone } from "../lib/timezones";

/** Empty form, with country and time zone guessed from the browser. */
export function blankFormValues(locale: string): FormValues {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: countryFromLocale(locale),
    whatsappOk: null,
    timezone: browserTimeZone(),
    answers: {},
    consent: false,
  };
}
