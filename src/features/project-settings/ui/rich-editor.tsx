"use client";

import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { cn } from "@/shared/cn";
import { LINK_PROTOCOLS, normalizeUrl } from "../logic/url";
import { EditorToolbar, type UrlMode } from "./editor-toolbar";
import { PROSE, taskExtensions } from "./task-extensions";
import { UrlBar } from "./url-bar";

/** Tiptap editor with a toolbar. Emits HTML. `labelId` names the editing area for assistive tech. */
export function RichEditor({ html, labelId, error, onChange, onBlur }: { html: string; labelId: string; error?: boolean; onChange: (html: string) => void; onBlur?: () => void }) {
  const [urlMode, setUrlMode] = useState<UrlMode>(null);
  const editor = useEditor({
    extensions: taskExtensions(),
    content: html,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
    onBlur: () => onBlur?.(),
    editorProps: { attributes: { role: "textbox", "aria-multiline": "true", "aria-labelledby": labelId, class: cn("min-h-44 px-4 py-3 focus:outline-none", PROSE) } },
  });

  if (!editor) return <div className="h-60 animate-pulse rounded-xl border border-line-strong bg-sand" aria-busy="true" aria-label="Loading editor" />;

  const closeBar = () => {
    setUrlMode(null);
    editor.commands.focus();
  };

  function applyLink(raw: string) {
    const href = normalizeUrl(raw, LINK_PROTOCOLS);
    if (!href || !editor) return;
    if (editor.state.selection.empty && !editor.isActive("link")) {
      editor.chain().focus().insertContent({ type: "text", text: raw.trim(), marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setUrlMode(null);
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-white focus-within:border-charcoal", error ? "border-signal" : "border-line-strong")}>
      <EditorToolbar editor={editor} urlMode={urlMode} onUrlMode={setUrlMode} />
      {urlMode === "link" && (
        <UrlBar
          kind="link"
          initialUrl={(editor.getAttributes("link").href as string | undefined) ?? ""}
          canRemove={editor.isActive("link")}
          validate={(raw) => (normalizeUrl(raw, LINK_PROTOCOLS) ? null : "Use a full link, like https://example.com.")}
          onApply={applyLink}
          onRemove={() => {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            setUrlMode(null);
          }}
          onCancel={closeBar}
        />
      )}
      {urlMode === "image" && (
        <UrlBar
          kind="image"
          validate={(raw) => (normalizeUrl(raw) ? null : "Use the full address of the picture, starting with https://.")}
          onApply={(url, alt) => {
            const src = normalizeUrl(url);
            if (src) editor.chain().focus().setImage({ src, alt: alt.trim() || undefined }).run();
            setUrlMode(null);
          }}
          onCancel={closeBar}
        />
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
