import { describe, expect, it } from "vitest";
import { cleanNameValue, extractVariables, fillTemplate, MissingVariableError, unknownVariables } from "./fill-template";

const values = { first_name: "Sam", cal_link: "https://cal.com/x" };

describe("fillTemplate", () => {
  it("fills every variable", () => {
    expect(fillTemplate("Hi {first_name}, book: {cal_link}", values)).toBe("Hi Sam, book: https://cal.com/x");
  });
  it("blocks and names a missing variable", () => {
    expect(() => fillTemplate("Hi {first_name} {last_name}", values)).toThrow(MissingVariableError);
    try {
      fillTemplate("Hi {last_name}", values);
    } catch (e) {
      expect((e as MissingVariableError).variable).toBe("last_name");
    }
  });
  it("treats an empty value as missing", () => {
    expect(() => fillTemplate("{cal_link}", { cal_link: "" })).toThrow();
  });
});

describe("mis-cased variables", () => {
  it("are found, flagged as unknown and never sent as typed", () => {
    expect(extractVariables("Hi {First_name} {FIRST_NAME}")).toEqual(["First_name", "FIRST_NAME"]);
    expect(unknownVariables("Hi {First_name} {first_name}")).toEqual(["First_name"]);
    expect(() => fillTemplate("Hi {First_name}", values)).toThrow(MissingVariableError);
  });
});

describe("cleanNameValue", () => {
  it("keeps ordinary names", () => {
    for (const n of ["Sam", "Anne-Marie", "O'Brien", "J.R.", "Zoe\u00eb", "Van Der Berg"]) expect(cleanNameValue(n)).toBe(n);
  });
  it("removes links, domains, addresses and control characters", () => {
    expect(cleanNameValue("Click evil.io now")).toBe("Click now");
    expect(cleanNameValue("Sam https://evil.example/x")).toBe("Sam");
    expect(cleanNameValue("see www.bad.com")).toBe("see");
    expect(cleanNameValue("a@b.co Sam")).toBe("Sam");
    expect(cleanNameValue("Sam\n\u202eevil")).toBe("Sam evil");
  });
});
