"use client";

import { useId, useState } from "react";
import { EditorContent, Extension, Mark, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Plugin } from "@tiptap/pm/state";
import { Bold, Heading1, Heading2, Italic, Link2, Underline } from "lucide-react";
import {
  INTRO_COLORS,
  INTRO_PROSE,
  INTRO_SIZES,
  INTRO_TEXT_MAX,
  introToHtml,
  introVisibleLength,
  isIntroColor,
  isIntroSize,
  type IntroColor,
  type IntroSize,
} from "@/features/projects";
import { cn } from "@/shared/cn";
import { LINK_PROTOCOLS, normalizeUrl } from "../logic/url";
import { ToolButton } from "./editor-toolbar";
import { UrlBar } from "./url-bar";

const SIZE_LABEL: Record<IntroSize, string> = { sm: "Small", lg: "Large", xl: "Extra large", huge: "Huge" };
const COLOR_LABEL: Record<IntroColor, string> = {
  signal: "Red",
  "signal-deep": "Deep red",
  charcoal: "Charcoal",
  muted: "Gray",
  blue: "Blue",
  ok: "Green",
  amber: "Amber",
  purple: "Purple",
};
// Written out so Tailwind sees each class.
const SWATCH: Record<IntroColor, string> = {
  signal: "bg-signal",
  "signal-deep": "bg-signal-deep",
  charcoal: "bg-charcoal",
  muted: "bg-muted",
  blue: "bg-blue",
  ok: "bg-ok",
  amber: "bg-amber",
  purple: "bg-purple",
};

/** One mark for color and size. It renders `<span data-color data-size>`, so the markup holds token names, not styles. */
const IntroStyle = Mark.create({
  name: "introStyle",
  addAttributes() {
    return {
      color: { default: null, parseHTML: (el) => (isIntroColor(el.getAttribute("data-color")) ? el.getAttribute("data-color") : null), renderHTML: (a) => (isIntroColor(a.color) ? { "data-color": a.color } : {}) },
      size: { default: null, parseHTML: (el) => (isIntroSize(el.getAttribute("data-size")) ? el.getAttribute("data-size") : null), renderHTML: (a) => (isIntroSize(a.size) ? { "data-size": a.size } : {}) },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-color],span[data-size]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
});

/** Stops an edit that would push the text over the limit. A longer text can still be cut down. */
const TextLimit = Extension.create({
  name: "introTextLimit",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        filterTransaction: (tr, state) => !tr.docChanged || tr.doc.textContent.length <= INTRO_TEXT_MAX || tr.doc.textContent.length <= state.doc.textContent.length,
      }),
    ];
  },
});

function introExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2] },
      blockquote: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      link: { openOnClick: false, autolink: false, protocols: ["mailto", "tel"], HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" } },
      underline: {},
    }),
    IntroStyle,
    TextLimit,
  ];
}

function setStyle(editor: Editor, patch: { color?: IntroColor | null; size?: IntroSize | null }) {
  const cur = editor.getAttributes("introStyle") as { color?: IntroColor | null; size?: IntroSize | null };
  const next = { color: cur.color ?? null, size: cur.size ?? null, ...patch };
  const chain = editor.chain().focus();
  if (!next.color && !next.size) chain.extendMarkRange("introStyle").unsetMark("introStyle").run();
  else chain.setMark("introStyle", next).run();
}

function IntroToolbar({ editor, linkOpen, onLink }: { editor: Editor; linkOpen: boolean; onLink: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const a = e.getAttributes("introStyle") as { color?: IntroColor | null; size?: IntroSize | null };
      return { h1: e.isActive("heading", { level: 1 }), h2: e.isActive("heading", { level: 2 }), link: e.isActive("link"), bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), color: a.color ?? null, size: a.size ?? null };
    },
  });
  const chain = () => editor.chain().focus();
  return (
    <div role="toolbar" aria-label="Text formatting" className="flex flex-wrap items-center gap-x-1 gap-y-1.5 border-b border-line bg-white px-2 py-1.5">
      <ToolButton label="Title (large)" pressed={s.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="size-[18px]" aria-hidden />
      </ToolButton>
      <ToolButton label="Subtitle" pressed={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-[18px]" aria-hidden />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-line-strong" aria-hidden />
      <ToolButton label="Bold" pressed={s.bold} onClick={() => chain().toggleBold().run()}>
        <Bold className="size-[18px]" aria-hidden />
      </ToolButton>
      <ToolButton label="Italic" pressed={s.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic className="size-[18px]" aria-hidden />
      </ToolButton>
      <ToolButton label="Underline" pressed={s.underline} onClick={() => chain().toggleUnderline().run()}>
        <Underline className="size-[18px]" aria-hidden />
      </ToolButton>
      <ToolButton label="Link" pressed={s.link || linkOpen} onClick={onLink}>
        <Link2 className="size-[18px]" aria-hidden />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-line-strong" aria-hidden />
      <select
        aria-label="Text size"
        value={s.size ?? ""}
        onChange={(e) => setStyle(editor, { size: isIntroSize(e.target.value) ? e.target.value : null })}
        className="h-8 rounded-md border border-line-strong bg-white px-2 text-[13.5px] font-semibold text-charcoal"
      >
        <option value="">Normal size</option>
        {INTRO_SIZES.map((v) => (
          <option key={v} value={v}>
            {SIZE_LABEL[v]}
          </option>
        ))}
      </select>
      <span className="mx-1 h-5 w-px bg-line-strong" aria-hidden />
      <div role="group" aria-label="Text color" className="flex flex-wrap items-center gap-1">
        {INTRO_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={COLOR_LABEL[c]}
            title={COLOR_LABEL[c]}
            aria-pressed={s.color === c}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setStyle(editor, { color: s.color === c ? null : c })}
            className="grid size-8 place-items-center rounded-md hover:bg-line"
          >
            <span className={cn("size-[18px] rounded-full border border-line-strong", SWATCH[c], s.color === c && "outline-2 outline-offset-2 outline-charcoal")} />
          </button>
        ))}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setStyle(editor, { color: null })}
          className="h-8 rounded-md px-2 text-[13px] font-semibold text-muted hover:bg-line"
        >
          Default color
        </button>
      </div>
    </div>
  );
}

/**
 * Intro paragraph editor. Enter starts a new paragraph, Shift+Enter a line break.
 * Emits sanitizable HTML, or "" when empty. Older plain-text intros open as one paragraph per line.
 */
export function IntroEditor({ label, html, onChange }: { label: string; html: string; onChange: (html: string) => void }) {
  const labelId = useId();
  const [linkOpen, setLinkOpen] = useState(false);
  const editor = useEditor({
    extensions: introExtensions(),
    content: introToHtml(html),
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
    editorProps: {
      // Cmd or Ctrl plus click opens a link in a new tab. A plain click only places the cursor, so the link stays editable.
      handleClick: (_view, _pos, event) => {
        const a = event.target instanceof Element ? event.target.closest("a[href]") : null;
        if (!a || !(event.metaKey || event.ctrlKey)) return false;
        window.open(a.getAttribute("href") ?? "", "_blank", "noopener,noreferrer");
        return true;
      },
      attributes: { role: "textbox", "aria-multiline": "true", "aria-labelledby": labelId, class: cn("min-h-28 px-4 py-3 text-[15px] leading-normal text-muted focus:outline-none", INTRO_PROSE) },
    },
  });
  const used = editor ? editor.getText().length : introVisibleLength(html);

  return (
    <div className="flex flex-col gap-1.5">
      <p id={labelId} className="text-[14px] font-bold leading-snug">
        {label}
      </p>
      {editor ? (
        <div className="overflow-hidden rounded-xl border border-line-strong bg-white focus-within:border-charcoal">
          <IntroToolbar editor={editor} linkOpen={linkOpen} onLink={() => setLinkOpen((v) => !v)} />
          {linkOpen && (
            <UrlBar
              kind="link"
              initialUrl={(editor.getAttributes("link").href as string | undefined) ?? ""}
              canRemove={editor.isActive("link")}
              validate={(raw) => (normalizeUrl(raw, LINK_PROTOCOLS) ? null : "Use a full link, like https://example.com.")}
              onApply={(raw) => {
                const href = normalizeUrl(raw, LINK_PROTOCOLS);
                if (!href) return;
                if (editor.state.selection.empty && !editor.isActive("link")) {
                  editor.chain().focus().insertContent({ type: "text", text: raw.trim(), marks: [{ type: "link", attrs: { href } }] }).run();
                } else {
                  editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
                }
                setLinkOpen(false);
              }}
              onRemove={() => {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
                setLinkOpen(false);
              }}
              onCancel={() => {
                setLinkOpen(false);
                editor.commands.focus();
              }}
            />
          )}
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div className="h-44 animate-pulse rounded-xl border border-line-strong bg-sand" aria-busy="true" aria-label="Loading editor" />
      )}
      <p className="text-[13px] leading-snug text-subtle">
        Shows on the first screen of the application. Select text, then use the toolbar. Enter starts a new paragraph. Shift+Enter breaks the line. Cmd or Ctrl plus click opens a link in a new tab. {used} of {INTRO_TEXT_MAX} characters.
      </p>
    </div>
  );
}
