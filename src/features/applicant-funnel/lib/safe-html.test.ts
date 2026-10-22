import { describe, expect, it } from "vitest";
import { isSafeImageSrc, looksLikeHtml, plainParagraphs } from "./safe-html";

describe("looksLikeHtml", () => {
  it("detects markup", () => {
    expect(looksLikeHtml("<p>Hello</p>")).toBe(true);
    expect(looksLikeHtml("Write the first text.\nGet him on a call.")).toBe(false);
    expect(looksLikeHtml("5 < 6 and 7 > 3")).toBe(false);
  });
});

describe("plainParagraphs", () => {
  it("splits on newlines and drops blanks", () => {
    expect(plainParagraphs("a\n\n b \n")).toEqual(["a", " b "]);
  });
});

describe("isSafeImageSrc", () => {
  it("allows https only", () => {
    expect(isSafeImageSrc("https://cdn.example.com/a.png")).toBe(true);
    expect(isSafeImageSrc("http://cdn.example.com/a.png")).toBe(false);
    expect(isSafeImageSrc("data:image/png;base64,AAAA")).toBe(false);
    expect(isSafeImageSrc("javascript:alert(1)")).toBe(false);
    expect(isSafeImageSrc("/relative.png")).toBe(false);
  });
});
