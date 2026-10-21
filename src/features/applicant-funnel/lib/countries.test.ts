import { describe, expect, it } from "vitest";
import { countryFromLocale, listCountries } from "./countries";

describe("countries", () => {
  it("reads the region from a locale", () => {
    expect(countryFromLocale("en-GB")).toBe("GB");
    expect(countryFromLocale("nl-NL")).toBe("NL");
    expect(countryFromLocale("en")).toBe("US");
    expect(countryFromLocale(undefined)).toBe("US");
  });
  it("lists countries with dial codes", () => {
    expect(listCountries().find((c) => c.code === "US")?.dial).toBe("+1");
  });
});
