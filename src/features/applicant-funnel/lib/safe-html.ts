const ALLOWED_TAGS = new Set(["P", "H1", "H2", "H3", "STRONG", "B", "EM", "I", "UL", "OL", "LI", "A", "IMG", "BR"]);
const SAFE_URL = /^(https?:|mailto:)/i;

/** True when the text contains markup. Plain text from older projects is rendered as paragraphs instead. */
export function looksLikeHtml(text: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(text);
}

/** Splits plain text on blank or single newlines into non-empty paragraphs. */
export function plainParagraphs(text: string): string[] {
  return text.split(/\n+/).filter((p) => p.trim());
}

function cleanNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  if (!ALLOWED_TAGS.has(el.tagName)) {
    // Unknown tag: keep its text children, drop the tag itself (and drop script/style bodies entirely).
    if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return null;
    const frag = doc.createDocumentFragment();
    el.childNodes.forEach((c) => {
      const cleaned = cleanNode(c, doc);
      if (cleaned) frag.appendChild(cleaned);
    });
    return frag;
  }
  const out = doc.createElement(el.tagName.toLowerCase());
  if (el.tagName === "A") {
    const href = el.getAttribute("href") ?? "";
    if (SAFE_URL.test(href)) out.setAttribute("href", href);
    out.setAttribute("target", "_blank");
    out.setAttribute("rel", "noopener noreferrer");
  }
  if (el.tagName === "IMG") {
    const src = el.getAttribute("src") ?? "";
    if (!/^https?:/i.test(src)) return null;
    out.setAttribute("src", src);
    out.setAttribute("alt", el.getAttribute("alt") ?? "");
  }
  el.childNodes.forEach((c) => {
    const cleaned = cleanNode(c, doc);
    if (cleaned) out.appendChild(cleaned);
  });
  return out;
}

/** Browser only. Keeps a small allowlist of tags, forces links to open in a new tab, drops everything else. */
export function sanitizeTaskHtml(html: string): string {
  if (typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const wrap = doc.createElement("div");
  doc.body.childNodes.forEach((c) => {
    const cleaned = cleanNode(c, doc);
    if (cleaned) wrap.appendChild(cleaned);
  });
  return wrap.innerHTML;
}
