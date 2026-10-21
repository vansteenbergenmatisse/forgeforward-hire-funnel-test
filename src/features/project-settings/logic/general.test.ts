import { describe, expect, it } from "vitest";
import { normalizeCalLink, validateCalLink, validateProjectName, validateReplyDays } from "./general";

describe("general validation", () => {
  it("project name", () => {
    expect(validateProjectName(" ")).not.toBeNull();
    expect(validateProjectName("Appointment Setter")).toBeNull();
    expect(validateProjectName("x".repeat(61))).not.toBeNull();
  });
  it("reply days", () => {
    for (const v of ["", "0", "31", "2.5", "abc"]) expect(validateReplyDays(v)).not.toBeNull();
    for (const v of ["1", "5", "30"]) expect(validateReplyDays(v)).toBeNull();
  });
  it("cal link", () => {
    expect(normalizeCalLink("cal.com/forgeforward/interview")).toBe("https://cal.com/forgeforward/interview");
    expect(normalizeCalLink("https://cal.com/a/b/")).toBe("https://cal.com/a/b");
    for (const v of ["", "nonsense", "javascript:alert(1)", "https://cal.com", "ftp://cal.com/a"]) expect(normalizeCalLink(v)).toBeNull();
    expect(validateCalLink("")).not.toBeNull();
    expect(validateCalLink("cal.com/a/b")).toBeNull();
  });
});
