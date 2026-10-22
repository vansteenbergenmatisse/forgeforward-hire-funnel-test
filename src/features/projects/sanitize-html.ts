// Server-side allowlist sanitizer for the Tiptap task body. No DOM, no dependency.
// Output only contains the tags and attributes below, with escaped attribute values.

const ALLOWED: Record<string, readonly string[]> = {
  p: [],
  br: [],
  hr: [],
  strong: [],
  b: [],
  em: [],
  i: [],
  u: [],
  s: [],
  code: [],
  pre: [],
  blockquote: [],
  ul: [],
  ol: [],
  li: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  a: ["href"],
  img: ["src", "alt"],
};
const VOID = new Set(["br", "hr", "img"]);
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|template|noscript|svg|math)\b[\s\S]*?(?:<\/\1\s*>|$)/gi;
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", colon: ":", tab: "\t", newline: "\n", nbsp: " " };

function decodeEntities(v: string): string {
  return v.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);?/gi, (m, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return NAMED[body.toLowerCase()] ?? m;
  });
}

function escapeAttr(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeText(v: string): string {
  return v.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeUrl(raw: string, schemes: RegExp): string | null {
  const decoded = decodeEntities(raw);
  const compact = decoded.replace(/[\u0000- \u007f-\u009f]/g, "");
  return schemes.test(compact) ? decoded.trim() : null;
}

function readAttrs(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(ATTR)) {
    const name = m[1].toLowerCase();
    if (!(name in out)) out[name] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return out;
}

function openTag(name: string, attrSource: string): string | null {
  const attrs = readAttrs(attrSource);
  if (name === "a") {
    const href = safeUrl(attrs.href ?? "", /^(https?:|mailto:|tel:)/i);
    return href ? `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">` : "<a>";
  }
  if (name === "img") {
    const src = safeUrl(attrs.src ?? "", /^https?:\/\//i);
    if (!src) return null;
    return `<img src="${escapeAttr(src)}" alt="${escapeAttr(decodeEntities(attrs.alt ?? ""))}">`;
  }
  return `<${name}>`;
}

export function sanitizeTaskHtml(input: string): string {
  const src = input.replace(/<!--[\s\S]*?(?:-->|$)/g, "").replace(DROP_WITH_CONTENT, "");
  const stack: string[] = [];
  let out = "";
  let last = 0;
  for (const m of src.matchAll(TAG)) {
    out += escapeText(src.slice(last, m.index));
    last = m.index + m[0].length;
    const closing = m[1] === "/";
    const name = m[2].toLowerCase();
    if (!(name in ALLOWED)) continue;
    if (closing) {
      const at = stack.lastIndexOf(name);
      if (at < 0) continue;
      while (stack.length > at) out += `</${stack.pop()}>`;
      continue;
    }
    const html = openTag(name, m[3]);
    if (html === null) continue;
    out += html;
    if (name === "a") stack.push("a");
    else if (!VOID.has(name)) stack.push(name);
  }
  out += escapeText(src.slice(last));
  while (stack.length) out += `</${stack.pop()}>`;
  return out;
}

/** Visible text of sanitized or raw HTML. An image counts as content. */
export function htmlPlainText(html: string): string {
  if (/<img\b/i.test(html)) return "image";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Plain text to one paragraph per line, escaped. */
export function textToHtml(text: string): string {
  return text
    .split(/\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
    .join("");
}

type Doc = { type?: string; text?: string; content?: Doc[]; marks?: { type: string; attrs?: { href?: string } }[]; attrs?: Record<string, unknown> };

/** Old rows stored Tiptap JSON. Convert the nodes the editor can produce to HTML, then sanitize. */
export function tiptapJsonToHtml(doc: unknown): string {
  const render = (n: Doc): string => {
    const inner = (n.content ?? []).map(render).join("");
    switch (n.type) {
      case "doc":
        return inner;
      case "paragraph":
        return `<p>${inner}</p>`;
      case "heading":
        return `<h${Number(n.attrs?.level) || 2}>${inner}</h${Number(n.attrs?.level) || 2}>`;
      case "bulletList":
        return `<ul>${inner}</ul>`;
      case "orderedList":
        return `<ol>${inner}</ol>`;
      case "listItem":
        return `<li>${inner}</li>`;
      case "hardBreak":
        return "<br>";
      case "image":
        return `<img src="${escapeAttr(String(n.attrs?.src ?? ""))}" alt="${escapeAttr(String(n.attrs?.alt ?? ""))}">`;
      case "text": {
        let t = escapeText(n.text ?? "");
        for (const mark of n.marks ?? []) {
          if (mark.type === "bold") t = `<strong>${t}</strong>`;
          else if (mark.type === "italic") t = `<em>${t}</em>`;
          else if (mark.type === "link") t = `<a href="${escapeAttr(mark.attrs?.href ?? "")}">${t}</a>`;
        }
        return t;
      }
      default:
        return inner;
    }
  };
  return sanitizeTaskHtml(render(doc as Doc));
}

/** Reads the jsonb `task_content` column: `{ html }`, a bare string, or legacy Tiptap JSON. Always sanitized. */
export function readTaskContent(value: unknown): string {
  if (typeof value === "string") return sanitizeTaskHtml(value);
  if (value && typeof value === "object") {
    const v = value as { html?: unknown; type?: unknown };
    if (typeof v.html === "string") return sanitizeTaskHtml(v.html);
    if (v.type === "doc") return tiptapJsonToHtml(value);
  }
  return "";
}
