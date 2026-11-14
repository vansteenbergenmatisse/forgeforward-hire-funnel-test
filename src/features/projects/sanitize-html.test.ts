import { describe, expect, it } from "vitest";
import { htmlPlainText, readIntro, readTaskContent, sanitizeIntroHtml, sanitizeTaskHtml, textToHtml } from "./sanitize-html";

describe("sanitizeTaskHtml", () => {
  it("keeps allowed markup", () => {
    expect(sanitizeTaskHtml("<h2>Hi</h2><p>a <strong>b</strong> <em>c</em></p><ul><li>x</li></ul>")).toBe(
      "<h2>Hi</h2><p>a <strong>b</strong> <em>c</em></p><ul><li>x</li></ul>",
    );
  });
  it("drops scripts, styles and their content", () => {
    expect(sanitizeTaskHtml("<p>a</p><script>alert(1)</script><style>p{}</style>")).toBe("<p>a</p>");
  });
  it("drops event handlers and unknown attributes", () => {
    expect(sanitizeTaskHtml('<p onclick="x()" style="color:red">a</p>')).toBe("<p>a</p>");
  });
  it("blocks javascript: links, including encoded ones", () => {
    expect(sanitizeTaskHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizeTaskHtml('<a href="jav&#x61;script:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizeTaskHtml('<a href=" java\tscript:1">x</a>')).toBe("<a>x</a>");
  });
  it("forces safe link attributes", () => {
    expect(sanitizeTaskHtml('<a href="https://x.com/a?b=1&c=2">x</a>')).toBe(
      '<a href="https://x.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">x</a>',
    );
  });
  it("keeps https images only", () => {
    expect(sanitizeTaskHtml('<img src="https://x.com/a.png" alt="a">')).toBe('<img src="https://x.com/a.png" alt="a" referrerpolicy="no-referrer">');
    expect(sanitizeTaskHtml('<img src="data:image/png;base64,AA">')).toBe("");
    expect(sanitizeTaskHtml('<img src="javascript:x">')).toBe("");
  });
  it("escapes stray angle brackets and closes open tags", () => {
    expect(sanitizeTaskHtml("<p>1 < 2 and 3 > 2")).toBe("<p>1 &lt; 2 and 3 &gt; 2</p>");
    expect(sanitizeTaskHtml("</div><p>a</span>")).toBe("<p>a</p>");
  });
  it("does not let attribute quotes break out", () => {
    const out = sanitizeTaskHtml('<a href="https://x.com/&quot;onmouseover=&quot;x">y</a>');
    expect(out).not.toMatch(/onmouseover=[^&]/);
    expect(out).toContain("&quot;");
  });
  it("drops comments and svg", () => {
    expect(sanitizeTaskHtml("<!-- x --><svg onload=1><circle/></svg><p>a</p>")).toBe("<p>a</p>");
  });
});

describe("task content helpers", () => {
  it("reads html, strings and legacy tiptap json", () => {
    expect(readTaskContent({ html: "<p>a</p><script>x</script>" })).toBe("<p>a</p>");
    expect(readTaskContent("<p>b</p>")).toBe("<p>b</p>");
    expect(readTaskContent({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "c <d>" }] }] })).toBe("<p>c &lt;d&gt;</p>");
    expect(readTaskContent(null)).toBe("");
  });
  it("plain text and text to html", () => {
    expect(htmlPlainText("<p>a&nbsp;b</p>")).toBe("a b");
    expect(htmlPlainText('<img src="https://x.com/a.png">')).toBe("image");
    expect(textToHtml("a & b\nc")).toBe("<p>a &amp; b</p><p>c</p>");
  });
});

describe("sanitizeIntroHtml", () => {
  it("keeps paragraphs, breaks, bold, italic, underline and listed color and size", () => {
    const html = '<p>a<br><strong>b</strong> <em>c</em> <u>d</u></p><p></p><p><span data-color="signal" data-size="xl">e</span></p>';
    expect(sanitizeIntroHtml(html)).toBe(html);
  });
  it("drops unlisted colors and sizes and any style or class", () => {
    expect(sanitizeIntroHtml('<span data-color="red" data-size="9" style="color:red" class="x">a</span>')).toBe("<span>a</span>");
  });
  it("keeps titles and safe links, drops images, h3, scripts, handlers and javascript: links", () => {
    expect(sanitizeIntroHtml('<h1>t</h1><h2>u</h2><h3>v</h3><a href="https://x.com">l</a><a href="javascript:x()">j</a><img src="https://x.com/a.png"><script>x()</script><p onclick="x()">p</p>')).toBe(
      '<h1>t</h1><h2>u</h2>v<a href="https://x.com" target="_blank" rel="noopener noreferrer">l</a><a>j</a><p>p</p>',
    );
  });
});

describe("readIntro", () => {
  it("keeps plain text from older projects", () => {
    expect(readIntro("  Book calls.\nPart time.  ")).toBe("Book calls.\nPart time.");
  });
  it("returns blank for markup with no visible text", () => {
    expect(readIntro("<p></p><p><br></p>")).toBe("");
  });
  it("sanitizes markup", () => {
    expect(readIntro('<p onclick="x()">Hi <script>1</script></p>')).toBe("<p>Hi </p>");
  });
});
