import { describe, expect, it } from "vitest";
import { MOCK_QUESTIONS } from "@/features/projects";
import { countErrors, errorSummary, firstErrorKey, validateForm, type FormValues } from "./form-validation";

const good: FormValues = {
  firstName: "Sam",
  lastName: "Rivera",
  email: "sam@example.com",
  phone: "(415) 555-2671",
  country: "US",
  whatsappOk: true,
  timezone: "America/New_York",
  answers: { "q-years": "3 to 5 years" },
  consent: true,
};

describe("validateForm", () => {
  it("accepts a complete form", () => {
    expect(validateForm(good, MOCK_QUESTIONS)).toEqual({});
  });

  it("uses the spec messages", () => {
    const errors = validateForm(
      { ...good, lastName: " ", email: "sam@gmail", phone: "555 12", whatsappOk: null, consent: false, answers: {} },
      MOCK_QUESTIONS,
    );
    expect(errors.lastName).toBe("Enter your last name");
    expect(errors.email).toBe("Enter a valid email");
    expect(errors.phone).toBe("Check your phone number");
    expect(errors.consent).toBe("Tick the box to continue");
    expect(errors["q:q-years"]).toBeTruthy();
    expect(countErrors(errors)).toBe(6);
  });

  it("skips archived and optional questions", () => {
    const qs = [{ ...MOCK_QUESTIONS[0], archived: true }, { ...MOCK_QUESTIONS[0], id: "x", required: false }];
    expect(validateForm({ ...good, answers: {} }, qs)).toEqual({});
  });

  it("finds the first error in screen order", () => {
    const errors = validateForm({ ...good, email: "x", firstName: "" }, MOCK_QUESTIONS);
    expect(firstErrorKey(errors, MOCK_QUESTIONS)).toBe("firstName");
  });
});

describe("errorSummary", () => {
  it("pluralises", () => {
    expect(errorSummary(1)).toBe("1 thing needs a fix. We kept everything you typed.");
    expect(errorSummary(3)).toBe("3 things need a fix. We kept everything you typed.");
  });
});
