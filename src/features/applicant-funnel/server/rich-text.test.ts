import { describe, expect, it } from "vitest";
import { taskContentToHtml } from "./rich-text";

describe("taskContentToHtml", () => {
  it("passes HTML strings through", () => {
    expect(taskContentToHtml("<p>Hi</p>")).toBe("<p>Hi</p>");
  });
  it("renders Tiptap JSON with escaping and marks", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "A <b>" }] },
        { type: "paragraph", content: [{ type: "text", text: "go", marks: [{ type: "bold" }, { type: "link", attrs: { href: "https://x.test" } }] }] },
        { type: "paragraph", content: [{ type: "text", text: "bad", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] },
      ],
    };
    const html = taskContentToHtml(doc);
    expect(html).toContain("<h2>A &lt;b&gt;</h2>");
    expect(html).toContain('<a href="https://x.test"');
    expect(html).not.toContain("javascript:");
  });
  it("reads the { html } shape the Task settings tab saves", () => {
    expect(taskContentToHtml({ html: "<p>Write a text</p>" })).toBe("<p>Write a text</p>");
  });
  it("returns empty for null", () => {
    expect(taskContentToHtml(null)).toBe("");
  });
});
