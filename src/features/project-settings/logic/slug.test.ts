import { describe, expect, it } from "vitest";
import { slugify, validateSlug } from "./slug";

describe("slugify", () => {
  it("makes a clean slug", () => expect(slugify("  Appointment Setter! ")).toBe("appointment-setter"));
  it("strips accents", () => expect(slugify("Café Manager")).toBe("cafe-manager"));
  it("returns empty for symbols only", () => expect(slugify("!!!")).toBe(""));
});

describe("validateSlug", () => {
  it("accepts valid slugs", () => expect(validateSlug("appointment-setter")).toBeNull());
  it("rejects empty, uppercase, double hyphens and edges", () => {
    for (const s of ["", " ", "Abc", "a--b", "-a", "a-", "a b", "a_b"]) expect(validateSlug(s)).not.toBeNull();
  });
  it("rejects reserved and taken slugs", () => {
    expect(validateSlug("admin")).toMatch(/reserved/);
    expect(validateSlug("sales", ["sales"])).toMatch(/already/);
  });
  it("rejects very long slugs", () => expect(validateSlug("a".repeat(61))).not.toBeNull());
});
