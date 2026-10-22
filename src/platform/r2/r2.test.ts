import { describe, expect, it } from "vitest";
import { attachmentDisposition } from "./index";

describe("attachmentDisposition", () => {
  it("always forces a download", () => {
    expect(attachmentDisposition("cv.pdf")).toBe("attachment; filename=\"cv.pdf\"; filename*=UTF-8''cv.pdf");
  });
  it("strips quotes, slashes and control characters", () => {
    const v = attachmentDisposition('a"b/..\\c\r\n.pdf');
    expect(v).not.toMatch(/[\r\n]/);
    expect(v.split(";")[1]).toBe(' filename="a_b_.._c.pdf"');
  });
  it("keeps non-ASCII in the encoded name only", () => {
    expect(attachmentDisposition("é.pdf")).toContain("filename*=UTF-8''%C3%A9.pdf");
  });
  it("falls back for an empty name", () => {
    expect(attachmentDisposition("  ")).toContain('filename="download"');
  });
});
