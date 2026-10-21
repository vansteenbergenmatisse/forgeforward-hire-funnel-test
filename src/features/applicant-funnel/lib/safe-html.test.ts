import { describe, expect, it } from "vitest";
import { looksLikeHtml, plainParagraphs } from "./safe-html";

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
