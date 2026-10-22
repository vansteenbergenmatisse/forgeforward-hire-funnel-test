function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Plain text to a simple branded HTML email. Blank lines split paragraphs. Bare URLs become links. */
export function renderEmailHtml(text: string): string {
  const paras = text
    .trim()
    .split(/\n{2,}/)
    .map((p) => {
      const safe = escapeHtml(p).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#D93A31">$1</a>');
      return `<p style="margin:0 0 16px;line-height:1.6">${safe.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
  return [
    '<!doctype html><html><body style="margin:0;padding:24px;background:#FCFBF8;font-family:Inter,Arial,sans-serif;color:#0E1220">',
    '<div style="max-width:560px;margin:0 auto">',
    '<div style="border-top:4px solid #D93A31;padding-top:16px;font-size:16px">',
    paras,
    "</div></div></body></html>",
  ].join("");
}
