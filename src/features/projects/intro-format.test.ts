import { describe, expect, it } from "vitest";
import { INTRO_HTML_MAX, INTRO_TEXT_MAX, introFits, introToHtml, introVisibleLength } from "./intro-format";

describe("introToHtml", () => {
  it("turns each line of plain text into an escaped paragraph", () => {
    expect(introToHtml("a & b\n\n5 < 6")).toBe("<p>a &amp; b</p><p>5 &lt; 6</p>");
  });
  it("leaves markup alone", () => {
    expect(introToHtml("<p>x</p>")).toBe("<p>x</p>");
  });
});

describe("introFits", () => {
  it("counts visible text, not tags", () => {
    expect(introFits(`<p><strong>${"a".repeat(INTRO_TEXT_MAX)}</strong></p>`)).toBe(true);
    expect(introFits(`<p>${"a".repeat(INTRO_TEXT_MAX + 1)}</p>`)).toBe(false);
  });
  it("caps the markup", () => {
    expect(introFits("<p>a</p>".repeat(INTRO_HTML_MAX))).toBe(false);
    expect(introVisibleLength("<p>a&amp;b</p>")).toBe(3);
  });
});
