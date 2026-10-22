type Node = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
  content?: Node[];
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeUrl = (u: unknown) => (typeof u === "string" && /^(https?:|mailto:|\/)/i.test(u.trim()) ? esc(u.trim()) : null);

function inline(n: Node): string {
  let out = esc(n.text ?? "");
  for (const m of n.marks ?? []) {
    if (m.type === "bold") out = `<strong>${out}</strong>`;
    else if (m.type === "italic") out = `<em>${out}</em>`;
    else if (m.type === "link") {
      const href = safeUrl(m.attrs?.href);
      if (href) out = `<a href="${href}" target="_blank" rel="noopener noreferrer">${out}</a>`;
    }
  }
  return out;
}

function render(n: Node): string {
  const kids = () => (n.content ?? []).map(render).join("");
  switch (n.type) {
    case "text":
      return inline(n);
    case "paragraph":
      return `<p>${kids()}</p>`;
    case "heading": {
      const level = Math.min(Math.max(Number(n.attrs?.level) || 2, 1), 4);
      return `<h${level}>${kids()}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${kids()}</ul>`;
    case "orderedList":
      return `<ol>${kids()}</ol>`;
    case "listItem":
      return `<li>${kids()}</li>`;
    case "hardBreak":
      return "<br>";
    case "image": {
      const src = safeUrl(n.attrs?.src);
      return src ? `<img src="${src}" alt="${esc(String(n.attrs?.alt ?? ""))}">` : "";
    }
    default:
      return kids();
  }
}

/** task_content is `{ html }` (what the Task settings tab saves), an HTML string or Tiptap JSON. The funnel sanitizes the HTML again before rendering. */
export function taskContentToHtml(content: unknown): string {
  if (typeof content === "string") return content;
  if (content && typeof content === "object" && typeof (content as { html?: unknown }).html === "string") return (content as { html: string }).html;
  if (content && typeof content === "object") return render(content as Node);
  return "";
}
