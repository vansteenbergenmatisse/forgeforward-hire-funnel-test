import { describe, expect, it } from "vitest";
import { maskEmail, maskPhone } from "./masking";

describe("masking", () => {
  it("masks the email name", () => {
    expect(maskEmail("matt@forgeforward.com")).toBe("m***@forgeforward.com");
    expect(maskEmail("nope")).toBe("***");
  });
  it("masks the phone but keeps the ends", () => {
    const out = maskPhone("+31 6 12345678");
    expect(out.startsWith("+31")).toBe(true);
    expect(out.endsWith("78")).toBe(true);
    expect(out).not.toContain("12345");
  });
});
