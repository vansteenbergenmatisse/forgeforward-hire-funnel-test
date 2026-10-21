import { describe, expect, it } from "vitest";
import { fillTemplate, MissingVariableError } from "./fill-template";

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
