import { z } from "zod";
import { describe, expect, it } from "vitest";
import { MOCK_QUESTIONS } from "@/features/projects";
import { countErrors, errorSummary, firstErrorKey, parseNumberAnswer, validateForm, type FormValues } from "./form-validation";

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

describe("number answers", () => {
  it("accepts decimals typed with a dot or a comma", () => {
    expect(parseNumberAnswer("2.5")).toBe(2.5);
    expect(parseNumberAnswer("2,5")).toBe(2.5);
    expect(parseNumberAnswer("0.05")).toBe(0.05);
    expect(parseNumberAnswer(" 7 ")).toBe(7);
    expect(parseNumberAnswer(3)).toBe(3);
  });
  it("rejects text", () => {
    expect(parseNumberAnswer("abc")).toBeNull();
    expect(parseNumberAnswer("1e5")).toBeNull();
    expect(parseNumberAnswer("")).toBeNull();
    expect(parseNumberAnswer(true)).toBeNull();
  });
  it("validates a typed number question from its raw text", () => {
    const q = { ...MOCK_QUESTIONS[0], id: "n", type: "number" as const, required: true, archived: false };
    expect(validateForm({ ...good, answers: { n: "2,5" } }, [q])).toEqual({});
    expect(validateForm({ ...good, answers: { n: "2x" } }, [q])["q:n"]).toBe("Enter a number");
  });
});

describe("text length", () => {
  it("mirrors the server limits", () => {
    const short = { ...MOCK_QUESTIONS[0], id: "s", type: "short_text" as const, required: false, archived: false };
    const long = { ...short, id: "l", type: "long_text" as const };
    expect(validateForm({ ...good, answers: { s: "a".repeat(200), l: "a".repeat(2000) } }, [short, long])).toEqual({});
    const errors = validateForm({ ...good, answers: { s: "a".repeat(201), l: "a".repeat(2001) } }, [short, long]);
    expect(errors["q:s"]).toBeTruthy();
    expect(errors["q:l"]).toBeTruthy();
  });
});

describe("zod and the site CSP", () => {
  it("runs without the eval probe (the CSP has no unsafe-eval)", () => {
    expect(z.core.globalConfig.jitless).toBe(true);
  });
});
