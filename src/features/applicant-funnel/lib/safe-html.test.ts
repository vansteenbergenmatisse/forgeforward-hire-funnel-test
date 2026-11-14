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

describe("sanitizeTaskHtml in the browser", () => {
  it.skipIf(typeof DOMParser === "undefined")("keeps listed span values only", async () => {
    const { sanitizeTaskHtml } = await import("./safe-html");
    expect(sanitizeTaskHtml('<p><u>a</u><span data-color="signal" data-size="xl" style="color:red">b</span><span data-color="x">c</span></p>')).toBe(
      '<p><u>a</u><span data-color="signal" data-size="xl">b</span><span>c</span></p>',
    );
  });
});
